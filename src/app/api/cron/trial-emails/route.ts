import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { clerkClient } from "@clerk/nextjs/server";
import { runSequenceForRecipient } from "@/lib/email-sequences";
import { getEmailPreferences } from "@/lib/email-preferences";
import { captureServer } from "@/lib/analytics-server";
import { requireCronAuth } from "@/lib/cron-auth";

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

// Window: cover trial_expiry (steps up to day 14) + post_downgrade_nurture
// (steps up to +76 days post-downgrade = day 90 of account).
const CANDIDATE_WINDOW_DAYS = 95;

// calculator_followup is a tighter window: only fires within day 7 of the
// calculator save, so a 10-day window is plenty of slack to catch any save
// whose +7 step might still be due.
const CALCULATOR_WINDOW_DAYS = 10;

const STEP_TO_LEGACY_TYPE: Record<number, string> = {
  10: "day_10_save_card",
  14: "day_14_renews_today",
  15: "day_14_downgraded",
};

/**
 * Daily cron: drives all calculator + trial-time email sequences.
 *
 *   trial_expiry           anchor=trial_started_at         days 10–14 of trial
 *   post_downgrade_nurture anchor=trial_started_at+14d     days 17, 20, ... 90
 *   calculator_followup    anchor=calculator_saves.created days 1, 3, 7
 *
 * Per-step audience filters (`has_card_saved` true/false) split day-14 senders
 * between the renews-today and downgraded variants. post_downgrade_nurture only
 * runs for users with no card on file (would-be-paid users are skipped earlier).
 *
 * Successful trial_expiry sends are mirrored to the legacy `trial_email_log`
 * table during the Phase 1 transition so existing admin queries keep working.
 *
 * Schedule: 0 14 * * * (daily 14:00 UTC / 10 AM ET)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper)
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - CANDIDATE_WINDOW_DAYS * DAY_MS).toISOString();

  // Candidate window: any wedding whose trial could plausibly still be in scope.
  const { data: weddings } = await supabase
    .from("weddings")
    .select("id, user_id, partner1_name, trial_started_at, created_at")
    .gte("created_at", windowStart);

  let totalSent = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const w of weddings || []) {
    if (!w.user_id) continue;

    // Skip already paid: an active subscription means they're past the trial flow.
    const { data: purchase } = await supabase
      .from("subscriber_purchases")
      .select("id")
      .eq("user_id", w.user_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (purchase) continue;

    // Has a card been saved (= scheduled subscription pending)?
    const { data: scheduled } = await supabase
      .from("scheduled_subscriptions")
      .select("id")
      .eq("user_id", w.user_id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    const hasCardSaved = Boolean(scheduled);

    // Resolve email + first name.
    let recipientEmail: string | null = null;
    try {
      const clerk = await clerkClient();
      const u = await clerk.users.getUser(w.user_id);
      recipientEmail =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress || null;
    } catch {
      continue;
    }
    if (!recipientEmail) continue;

    const trialStart = new Date(w.trial_started_at || w.created_at);
    const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * DAY_MS);
    const firstName = (w.partner1_name || "").split(" ")[0] || "there";
    const endsOn = trialEnd.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const trialExpiryResult = await runSequenceForRecipient("trial_expiry", {
      userId: w.user_id,
      weddingId: w.id,
      email: recipientEmail,
      attrs: { has_card_saved: hasCardSaved },
      templateContext: {
        firstName,
        endsOn,
        appUrl: APP_URL,
        // day_14_renews_today expects a card description; pull last4 from the
        // scheduled subscription if available, otherwise fall back to a generic phrase.
        cardDescription: hasCardSaved ? "Your card on file" : "",
      },
      anchor: trialStart,
    });

    totalSent += trialExpiryResult.sent;
    totalSkipped += trialExpiryResult.skippedAudience + trialExpiryResult.skippedUnsubscribed;
    errors.push(...trialExpiryResult.errors);

    // Mirror successful trial_expiry sends to legacy table for backward compat.
    for (const step of trialExpiryResult.sentSteps) {
      const legacyType = STEP_TO_LEGACY_TYPE[step.stepOrder];
      if (!legacyType) continue;
      await supabase
        .from("trial_email_log")
        .upsert(
          { user_id: w.user_id, email_type: legacyType },
          { onConflict: "user_id,email_type", ignoreDuplicates: true }
        );
      await captureServer(w.user_id, "trial_email_sent", { email_type: legacyType });
    }

    // post_downgrade_nurture only runs for users without a card on file. The
    // anchor is the trial end date (= trial start + 14 days), so steps fire at
    // days 17, 20, 21, 25, 30, 45, 60, 90 of account age.
    if (!hasCardSaved) {
      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * DAY_MS);
      const prefs = await getEmailPreferences(w.id);
      const marketingUnsubscribed = prefs.unsubscribed_all || !prefs.marketing_emails;
      const nurtureResult = await runSequenceForRecipient("post_downgrade_nurture", {
        userId: w.user_id,
        weddingId: w.id,
        email: recipientEmail,
        attrs: { marketing_unsubscribed: marketingUnsubscribed },
        templateContext: {
          firstName,
          appUrl: APP_URL,
          unsubscribeToken: prefs.unsubscribe_token,
        },
        anchor: trialEnd,
      });

      totalSent += nurtureResult.sent;
      totalSkipped += nurtureResult.skippedAudience + nurtureResult.skippedUnsubscribed;
      errors.push(...nurtureResult.errors);

      for (const step of nurtureResult.sentSteps) {
        await captureServer(w.user_id, "nurture_email_sent", {
          step_order: step.stepOrder,
          template_slug: step.templateSlug,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // calculator_followup: 3 nurture emails between calculator submit and
  // trial day 10. Anchored to calculator_saves.created_at (the handoff
  // writes calculator_saves and weddings nearly simultaneously). We iterate
  // calculator_saves directly so leads who never finished the handoff (rare,
  // but possible if Clerk was down) still get the follow-up.
  // ──────────────────────────────────────────────────────────────────────
  const calcWindowStart = new Date(now - CALCULATOR_WINDOW_DAYS * DAY_MS).toISOString();
  const { data: calcSaves } = await supabase
    .from("calculator_saves")
    .select("id, email, name, budget, guests, state, created_at")
    .gte("created_at", calcWindowStart);

  for (const cs of calcSaves || []) {
    // Schema permits null created_at (default now()) but in practice every
    // row has one; guard anyway so the runner gets a valid anchor.
    if (!cs.created_at) continue;

    // Resolve Clerk user_id from email. The handoff creates the Clerk user
    // synchronously with the save, so this lookup is expected to succeed for
    // any save older than ~1 minute.
    let userId: string | null = null;
    try {
      const clerk = await clerkClient();
      const list = await clerk.users.getUserList({ emailAddress: [cs.email], limit: 1 });
      userId = list.data[0]?.id || null;
    } catch {
      continue;
    }
    if (!userId) continue;

    // Look up the wedding so we can read email preferences (per-wedding).
    const { data: wedding } = await supabase
      .from("weddings")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const weddingId = wedding?.id ?? null;

    let marketingUnsubscribed = false;
    let unsubscribeToken = "";
    if (weddingId) {
      const prefs = await getEmailPreferences(weddingId);
      marketingUnsubscribed = prefs.unsubscribed_all || !prefs.marketing_emails;
      unsubscribeToken = prefs.unsubscribe_token;
    }

    const firstName = (cs.name || "").split(" ")[0] || "there";
    const budgetFormatted = cs.budget.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

    const calcResult = await runSequenceForRecipient("calculator_followup", {
      userId,
      weddingId,
      email: cs.email,
      attrs: { marketing_unsubscribed: marketingUnsubscribed },
      templateContext: {
        firstName,
        guests: cs.guests,
        state: cs.state,
        budgetFormatted,
        appUrl: APP_URL,
        unsubscribeToken,
      },
      anchor: new Date(cs.created_at),
    });

    totalSent += calcResult.sent;
    totalSkipped += calcResult.skippedAudience + calcResult.skippedUnsubscribed;
    errors.push(...calcResult.errors);

    for (const step of calcResult.sentSteps) {
      await captureServer(userId, "calculator_followup_email_sent", {
        step_order: step.stepOrder,
        template_slug: step.templateSlug,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    skipped: totalSkipped,
    errors: errors.length ? errors : undefined,
  });
}

// Vercel cron always sends GET; admin manual-trigger UI POSTs internally.
// Re-export so both work.
export const POST = GET;
