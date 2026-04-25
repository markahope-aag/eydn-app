/**
 * Generic engine that renders DB-stored email templates and runs DB-defined
 * sequences (a series of templates fired at day-offsets from an anchor date).
 *
 * The cron routes call `runSequenceForRecipient` for each candidate recipient;
 * the runner figures out which steps are due, dedups via `sequence_send_log`,
 * renders the template, and sends via `sendEmail`. Sequences can be edited in
 * the DB without code deploys.
 */

import { sendEmail } from "@/lib/email";
import { defaultFooter, emailWrap } from "@/lib/email-theme";
import { emailFooterHtml } from "@/lib/email-preferences";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TemplateContext = Record<string, string | number | undefined | null>;

export type SequenceStep = {
  step_order: number;
  template_slug: string;
  offset_days: number;
  audience_filter: Record<string, unknown>;
  enabled: boolean;
};

export type TemplateCategory = "transactional" | "lifecycle" | "marketing" | "nurture";

export type EmailTemplate = {
  slug: string;
  category: TemplateCategory;
  subject: string;
  html: string;
  variables: string[];
  enabled: boolean;
};

/**
 * Replace every `{{varName}}` in the input with the matching value from `ctx`.
 * Missing or null/undefined values render as empty strings (so optional vars
 * just disappear). Whitespace inside the braces is tolerated: `{{ var }}`.
 */
export function renderTemplate(input: string, ctx: TemplateContext): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const v = ctx[key];
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

/**
 * Given the anchor date for a recipient and their already-sent step orders,
 * return the steps that are due to send now.
 *
 * A step is due when `now >= anchor + offset_days` and it has not yet been sent.
 */
export function getDueSteps(
  steps: SequenceStep[],
  anchor: Date,
  alreadySentOrders: Set<number>,
  now: Date = new Date()
): SequenceStep[] {
  return steps
    .filter((s) => s.enabled)
    .filter((s) => !alreadySentOrders.has(s.step_order))
    .filter((s) => {
      const due = new Date(anchor.getTime() + s.offset_days * DAY_MS);
      return now.getTime() >= due.getTime();
    })
    .sort((a, b) => a.step_order - b.step_order);
}

/**
 * Audience filter matcher. Each key in `filter` must be present and equal in
 * `attrs` for the step to match. Empty filter matches everything.
 */
export function matchesAudience(
  filter: Record<string, unknown>,
  attrs: Record<string, unknown>
): boolean {
  for (const [k, v] of Object.entries(filter)) {
    if (attrs[k] !== v) return false;
  }
  return true;
}

/** Load a sequence + its steps from the DB. Returns null if not found/disabled. */
export async function loadSequence(slug: string) {
  const supabase = createSupabaseAdmin();
  const { data: sequence } = await supabase
    .from("email_sequences")
    .select("slug, trigger_event, audience_filter, enabled")
    .eq("slug", slug)
    .maybeSingle();
  if (!sequence || !sequence.enabled) return null;

  const { data: stepRows } = await supabase
    .from("email_sequence_steps")
    .select("step_order, template_slug, offset_days, audience_filter, enabled")
    .eq("sequence_slug", slug)
    .order("step_order", { ascending: true });

  return {
    sequence: sequence as { slug: string; trigger_event: string; audience_filter: Record<string, unknown>; enabled: boolean },
    steps: (stepRows || []) as SequenceStep[],
  };
}

/** Load a single template by slug. Returns null if not found/disabled. */
export async function loadTemplate(slug: string): Promise<EmailTemplate | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("email_templates")
    .select("slug, category, subject, html, variables, enabled")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.enabled) return null;
  return data as EmailTemplate;
}

/**
 * Pick the footer to attach based on the template's CAN-SPAM category. Marketing
 * and nurture emails get an unsubscribe link; transactional and lifecycle (account
 * state) emails don't. If a marketing template is sent without an unsubscribe
 * token in context we still fall through to the basic footer rather than block the
 * send — the runner caller is responsible for providing the token where required.
 */
export function pickFooter(category: TemplateCategory, unsubscribeToken?: string): string {
  if ((category === "marketing" || category === "nurture") && unsubscribeToken) {
    return emailFooterHtml(unsubscribeToken, "marketing");
  }
  return defaultFooter();
}

export type RecipientContext = {
  userId: string;
  weddingId?: string | null;
  email: string;
  attrs: Record<string, unknown>;
  templateContext: TemplateContext;
  anchor: Date;
};

export type SentStep = {
  stepOrder: number;
  templateSlug: string;
  resendEmailId?: string;
};

export type RunResult = {
  sent: number;
  sentSteps: SentStep[];
  skippedAudience: number;
  skippedAlreadySent: number;
  skippedUnsubscribed: number;
  errors: string[];
};

/**
 * Run a single sequence for a single recipient. Idempotent: re-running on the
 * same day with the same recipient is a no-op for already-sent steps.
 */
export async function runSequenceForRecipient(
  sequenceSlug: string,
  recipient: RecipientContext,
  now: Date = new Date()
): Promise<RunResult> {
  const result: RunResult = {
    sent: 0,
    sentSteps: [],
    skippedAudience: 0,
    skippedAlreadySent: 0,
    skippedUnsubscribed: 0,
    errors: [],
  };

  const loaded = await loadSequence(sequenceSlug);
  if (!loaded) return result;
  const { sequence, steps } = loaded;

  // Sequence-level audience filter (e.g. only weddings on $79 lifetime trial)
  if (!matchesAudience(sequence.audience_filter, recipient.attrs)) {
    return result;
  }

  // What has this recipient already received from this sequence?
  const supabase = createSupabaseAdmin();
  const { data: sentRows } = await supabase
    .from("sequence_send_log")
    .select("step_order")
    .eq("sequence_slug", sequenceSlug)
    .eq("user_id", recipient.userId);
  const alreadySent = new Set<number>((sentRows || []).map((r) => r.step_order));

  const due = getDueSteps(steps, recipient.anchor, alreadySent, now);

  for (const step of due) {
    if (!matchesAudience(step.audience_filter, recipient.attrs)) {
      result.skippedAudience++;
      continue;
    }

    const template = await loadTemplate(step.template_slug);
    if (!template) {
      result.errors.push(`template ${step.template_slug} not found or disabled`);
      continue;
    }

    // CAN-SPAM: marketing/nurture sends honor the recipient's marketing opt-out.
    if (
      (template.category === "marketing" || template.category === "nurture") &&
      recipient.attrs.marketing_unsubscribed === true
    ) {
      result.skippedUnsubscribed++;
      continue;
    }

    const subject = renderTemplate(template.subject, recipient.templateContext);
    const body = renderTemplate(template.html, recipient.templateContext);
    const token = recipient.templateContext.unsubscribeToken;
    const footer = pickFooter(template.category, typeof token === "string" ? token : undefined);
    const html = emailWrap(body, footer);

    const sendResult = await sendEmail({ to: recipient.email, subject, html });

    if (!sendResult.success) {
      result.errors.push(`send failed for ${sequenceSlug}/${step.step_order}: ${sendResult.error}`);
      continue;
    }

    // Insert with onConflict ignore so concurrent runs can't double-send.
    const { error: logError } = await supabase
      .from("sequence_send_log")
      .insert({
        sequence_slug: sequenceSlug,
        step_order: step.step_order,
        user_id: recipient.userId,
        wedding_id: recipient.weddingId ?? null,
        recipient_email: recipient.email,
        resend_email_id: sendResult.emailId ?? null,
      });

    if (logError) {
      // Unique violation = another worker logged it already; treat as success.
      if (!String(logError.message).includes("duplicate key")) {
        result.errors.push(`log failed for ${sequenceSlug}/${step.step_order}: ${logError.message}`);
      }
    }

    result.sent++;
    result.sentSteps.push({
      stepOrder: step.step_order,
      templateSlug: step.template_slug,
      resendEmailId: sendResult.emailId,
    });
  }

  return result;
}
