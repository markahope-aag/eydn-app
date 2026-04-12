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

const TIMEOUT_MS = 15_000;
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

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
    if (!personalized) return tasks;

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
