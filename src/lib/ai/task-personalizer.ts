/**
 * AI-personalization pass over the deterministic task timeline.
 *
 * The hardcoded TASK_TIMELINE (+ generateTasks) produces reliable tasks
 * with correct dates, phases, and categories — that part stays safe and
 * deterministic. This module asks Claude to rewrite each task's
 * edyn_message in a voice tailored to this specific couple (venue,
 * budget, style, flags) so the timeline *feels* personalized even
 * though the structure is trusted.
 *
 * Failure mode is intentional: any error (missing API key, Claude
 * down, malformed JSON, timeout) returns the original tasks unchanged.
 * Onboarding never fails because of this layer.
 */

import { getClaudeClient } from "./claude-client";
import type { Database } from "@/lib/supabase/types";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

export type PersonalizationContext = {
  partner1_name: string;
  partner2_name: string;
  date: string | null;
  venue: string | null;
  venue_city: string | null;
  budget: number | null;
  guest_count_estimate: number | null;
  style_description: string | null;
  has_wedding_party: boolean | null;
  has_pre_wedding_events: boolean | null;
  has_honeymoon: boolean | null;
  booked_vendors: string[];
};

const TIMEOUT_MS = 25_000;
const MODEL = "claude-sonnet-4-6";
// One JSON entry per task across the full timeline (~66 tasks incl. subtasks).
// 4096 truncated the array mid-response → invalid JSON → silent fallback every
// time, which is why AI personalization never landed in production. 8192 leaves
// comfortable headroom for the whole array.
const MAX_TOKENS = 8192;

function buildPrompt(tasks: TaskInsert[], ctx: PersonalizationContext): string {
  const details: string[] = [];
  details.push(`Partners: ${ctx.partner1_name} & ${ctx.partner2_name}`);
  if (ctx.date) details.push(`Wedding date: ${ctx.date}`);
  if (ctx.venue) details.push(`Venue: ${ctx.venue}${ctx.venue_city ? ` in ${ctx.venue_city}` : ""}`);
  else if (ctx.venue_city) details.push(`Location: ${ctx.venue_city}`);
  if (ctx.guest_count_estimate) details.push(`Guest count: ~${ctx.guest_count_estimate}`);
  if (ctx.budget) details.push(`Budget: $${ctx.budget.toLocaleString()}`);
  if (ctx.style_description) details.push(`Style: ${ctx.style_description}`);
  details.push(`Wedding party: ${ctx.has_wedding_party ? "yes" : "no"}`);
  details.push(`Pre-wedding events: ${ctx.has_pre_wedding_events ? "yes" : "no"}`);
  details.push(`Honeymoon: ${ctx.has_honeymoon ? "yes" : "no"}`);
  if (ctx.booked_vendors.length > 0) details.push(`Already booked: ${ctx.booked_vendors.join(", ")}`);

  const taskList = tasks
    .map((t, i) => `${i}. ${t.title} — current message: "${t.edyn_message || ""}"`)
    .join("\n");

  return `You are Eydn, a warm, knowledgeable wedding planner writing personalized guidance for a couple.

This couple's wedding:
${details.join("\n")}

Below is their task timeline. For each task, rewrite the message in a voice that's warm and conversational, referencing specific details from their wedding where it's natural (don't force references — only include them when relevant). Keep each message to 1-3 sentences. Don't change task titles or add or remove tasks.

Tasks:
${taskList}

Respond with ONLY a JSON array in this exact shape, no prose before or after:
[{"index": 0, "edynMessage": "..."}, {"index": 1, "edynMessage": "..."}, ...]

Include one entry per task, using the same indices as above.`;
}

// ─── Deterministic personalization ──────────────────────────────────────────
// A guaranteed baseline that weaves the couple's real details (venue, budget,
// guest count, date, style, names) into the tasks where those details actually
// matter — no API call, never fails. The AI pass runs on top of this and
// refines the voice when it's available; when it isn't, these messages still
// make the timeline feel personalized. Brand voice: warm, direct, calm — no
// exclamation points, no cheerleader copy.

function formatWeddingDate(date: string | null): string | null {
  if (!date) return null;
  // Anchor at midday so the YYYY-MM-DD value doesn't shift a day across
  // timezones when formatted.
  const d = new Date(`${date}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** title → builder that returns a personalized message, or null to keep the
 *  default (when the relevant detail is missing — the "where relevant" rule). */
const DETERMINISTIC_BUILDERS: Record<string, (c: PersonalizationContext) => string | null> = {
  "Set Budget": (c) =>
    c.budget
      ? `Let's lock in your $${c.budget.toLocaleString()} budget, ${c.partner1_name} & ${c.partner2_name}. Breaking it into categories now keeps everything in control — no stress later.`
      : null,
  "Choose Wedding Date": (c) => {
    const d = formatWeddingDate(c.date);
    return d
      ? `${d} it is. Worth holding loosely until your venue's locked — the right space is worth a small tweak.`
      : null;
  },
  "Create Guest List Draft": (c) =>
    c.guest_count_estimate
      ? `Around ${c.guest_count_estimate} to start — pull together family, friends, and plus-ones. You can refine the list anytime.`
      : null,
  "Book Venue": (c) => {
    const where = c.venue ? ` ${c.venue}` : c.venue_city ? ` a venue in ${c.venue_city}` : null;
    return where
      ? `Time to book${where}. Once it's set, your date and the rest of the plan settle around it.`
      : null;
  },
  "Choose Wedding Colors/Theme": (c) =>
    c.style_description
      ? `You described your style as "${c.style_description}". Let's turn that into a palette and theme you both love.`
      : null,
  "Plan Seating Chart Draft": (c) =>
    c.guest_count_estimate
      ? `With about ${c.guest_count_estimate} guests, a rough seating draft now saves a scramble later.`
      : null,
  "Finalize Seating Chart": (c) => {
    const at = c.venue ? ` at ${c.venue}` : "";
    return c.guest_count_estimate
      ? `Lock in where your ${c.guest_count_estimate} guests sit${at}. Everyone needs their spot.`
      : null;
  },
  "Final Guest Count": (c) =>
    c.guest_count_estimate
      ? `Your final headcount drives catering, rentals, and the venue. You estimated around ${c.guest_count_estimate} — time to confirm the real number.`
      : null,
  "Send Save-the-Dates": (c) =>
    c.guest_count_estimate
      ? `Give your ~${c.guest_count_estimate} guests a heads-up, especially anyone traveling in.`
      : null,
  "Order Invitations": (c) =>
    c.guest_count_estimate
      ? `Order enough for your ~${c.guest_count_estimate} guests, plus a few extras for keepsakes and slips of the pen.`
      : null,
};

/**
 * Apply the deterministic personalization baseline. Returns a new task array
 * with edyn_message rewritten for the tasks where a relevant detail exists;
 * all other tasks are returned unchanged. Pure and synchronous — safe to run
 * before the AI pass on every onboarding.
 */
export function applyDeterministicMessages(
  tasks: TaskInsert[],
  ctx: PersonalizationContext
): TaskInsert[] {
  return tasks.map((task) => {
    const builder = task.title ? DETERMINISTIC_BUILDERS[task.title] : undefined;
    if (!builder) return task;
    const message = builder(ctx);
    return message ? { ...task, edyn_message: message } : task;
  });
}

type PersonalizedMessage = { index: number; edynMessage: string };

function parseResponse(raw: string): PersonalizedMessage[] | null {
  // Strip code fences if Claude wrapped the JSON in them.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;
    const out: PersonalizedMessage[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" && item !== null &&
        typeof (item as PersonalizedMessage).index === "number" &&
        typeof (item as PersonalizedMessage).edynMessage === "string"
      ) {
        out.push(item as PersonalizedMessage);
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Personalize each task's edyn_message via Claude. On any failure
 * (no API key, network error, malformed response, timeout) returns
 * the input tasks unchanged. Date math, category, and phase are never
 * modified by AI — only the user-visible message.
 */
export async function personalizeTaskMessages(
  tasks: TaskInsert[],
  ctx: PersonalizationContext
): Promise<TaskInsert[]> {
  if (tasks.length === 0) return tasks;
  if (!process.env.ANTHROPIC_API_KEY) return tasks;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const claude = getClaudeClient();
    const response = await claude.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: buildPrompt(tasks, ctx) }],
      },
      { signal: controller.signal }
    );

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    const personalized = parseResponse(text);
    if (!personalized) {
      // Most likely a truncated array (max_tokens) or non-JSON prose. Log the
      // reason so this can't silently regress to generic messages again.
      console.warn(
        `[task-personalizer] unparseable response (stop_reason=${response.stop_reason}); keeping deterministic messages`
      );
      return tasks;
    }

    const byIndex = new Map(personalized.map((p) => [p.index, p.edynMessage]));
    return tasks.map((task, i) => {
      const newMessage = byIndex.get(i);
      return newMessage ? { ...task, edyn_message: newMessage } : task;
    });
  } catch (err) {
    console.warn("[task-personalizer] falling back to default messages:", err);
    return tasks;
  } finally {
    clearTimeout(timeout);
  }
}
