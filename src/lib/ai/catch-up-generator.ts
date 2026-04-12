/**
 * AI catch-up plan generator.
 *
 * When a couple has fallen behind on their planning — overdue tasks,
 * no recent task completions, or both — this module builds a prompt
 * from their current wedding state and asks Claude to return a
 * prioritized 2-week recovery plan. The plan is structured JSON:
 * a short summary plus 3-7 prioritized actions with reasoning and
 * a rough "when" hint.
 *
 * Detection is handled by shouldTriggerCatchUp() so the route layer
 * can decide whether to even call the generator. Generation failure
 * is never silent — callers get null so they can decide how to
 * surface the error.
 */

import { getClaudeClient } from "./claude-client";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 20_000;

// Detection thresholds. Tune after launch.
export const CATCH_UP_THRESHOLDS = {
  /** Minimum number of overdue tasks to trigger a plan. */
  OVERDUE_TASKS: 5,
} as const;

export type CatchUpTaskInput = {
  title: string;
  category: string | null;
  due_date: string | null;
  completed: boolean;
  notes?: string | null;
};

export type CatchUpWeddingContext = {
  partner1_name: string | null;
  partner2_name: string | null;
  wedding_date: string | null;
  venue: string | null;
  venue_city: string | null;
  budget: number | null;
  guest_count_estimate: number | null;
  style_description: string | null;
};

export type CatchUpDetection =
  | { triggered: false }
  | { triggered: true; reason: string; overdueCount: number };

/**
 * Decide whether this wedding is "behind" enough to warrant a catch-up
 * plan. Currently checks overdue-task count only — the "stale completion"
 * signal would need a completed_at column on the tasks table, which
 * doesn't exist yet. TODO(task): add completed_at + stale trigger.
 */
export function shouldTriggerCatchUp(tasks: CatchUpTaskInput[], now: Date = new Date()): CatchUpDetection {
  const today = now.getTime();
  const overdue = tasks.filter(
    (t) => !t.completed && t.due_date !== null && new Date(t.due_date).getTime() < today
  );

  if (overdue.length < CATCH_UP_THRESHOLDS.OVERDUE_TASKS) return { triggered: false };

  return {
    triggered: true,
    reason: `${overdue.length} overdue tasks`,
    overdueCount: overdue.length,
  };
}

export type CatchUpPriority = {
  title: string;
  why: string;
  when: string;
};

export type CatchUpPlan = {
  summary: string;
  priorities: CatchUpPriority[];
};

function buildPrompt(
  tasks: CatchUpTaskInput[],
  ctx: CatchUpWeddingContext,
  detection: Extract<CatchUpDetection, { triggered: true }>
): string {
  const details: string[] = [];
  if (ctx.partner1_name && ctx.partner2_name) {
    details.push(`Couple: ${ctx.partner1_name} & ${ctx.partner2_name}`);
  }
  if (ctx.wedding_date) details.push(`Wedding date: ${ctx.wedding_date}`);
  if (ctx.venue) details.push(`Venue: ${ctx.venue}${ctx.venue_city ? ` (${ctx.venue_city})` : ""}`);
  if (ctx.guest_count_estimate) details.push(`Guest count: ~${ctx.guest_count_estimate}`);
  if (ctx.budget) details.push(`Budget: $${ctx.budget.toLocaleString()}`);
  if (ctx.style_description) details.push(`Style: ${ctx.style_description}`);

  const now = new Date();
  const overdue = tasks
    .filter((t) => !t.completed && t.due_date && new Date(t.due_date) < now)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 15);
  const upcoming = tasks
    .filter((t) => !t.completed && t.due_date && new Date(t.due_date) >= now)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 10);

  const overdueLines = overdue.map((t) => `- ${t.title} (${t.category ?? "Task"}) — was due ${t.due_date}`);
  const upcomingLines = upcoming.map((t) => `- ${t.title} (${t.category ?? "Task"}) — due ${t.due_date}`);

  return `You are Eydn, a warm but decisive wedding planner helping a couple get back on track.

Their planning has stalled — detection signal: ${detection.reason}.

Wedding details:
${details.join("\n")}

Overdue tasks (up to 15 most urgent):
${overdueLines.join("\n") || "(none)"}

Next upcoming tasks:
${upcomingLines.join("\n") || "(none)"}

Build a focused 2-week catch-up plan. Pick 3-7 of the most important actions — do NOT try to list everything. Prioritize what unblocks other work (venue before vendors, guest list before invites, etc.). For each action:
- title: a short imperative ("Lock in your photographer")
- why: 1-2 sentences on why this matters right now given their situation
- when: a rough deadline or cadence ("This weekend", "Within 3 days", "Week of May 5")

Also write a 2-3 sentence "summary" that reassures the couple — acknowledge they're behind but frame this as a recovery plan, not a scolding.

Respond with ONLY this JSON shape, no prose before or after:
{"summary": "...", "priorities": [{"title": "...", "why": "...", "when": "..."}, ...]}`;
}

function parsePlan(raw: string): CatchUpPlan | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.priorities)
    ) {
      return null;
    }
    const priorities: CatchUpPriority[] = [];
    for (const p of parsed.priorities) {
      if (
        typeof p === "object" && p !== null &&
        typeof p.title === "string" &&
        typeof p.why === "string" &&
        typeof p.when === "string"
      ) {
        priorities.push({ title: p.title, why: p.why, when: p.when });
      }
    }
    if (priorities.length === 0) return null;
    return { summary: parsed.summary, priorities };
  } catch {
    return null;
  }
}

export type GenerateResult =
  | { ok: true; plan: CatchUpPlan; model: string; triggerReason: string }
  | { ok: false; error: string };

/**
 * Generate a catch-up plan via Claude. Callers should check
 * shouldTriggerCatchUp() first so we only pay for inference when the
 * couple is actually behind.
 */
export async function generateCatchUpPlan(
  tasks: CatchUpTaskInput[],
  ctx: CatchUpWeddingContext,
  detection: Extract<CatchUpDetection, { triggered: true }>
): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "AI is not configured." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const claude = getClaudeClient();
    const response = await claude.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: buildPrompt(tasks, ctx, detection) }],
      },
      { signal: controller.signal }
    );

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    const plan = parsePlan(text);
    if (!plan) return { ok: false, error: "Got an unexpected response. Try again." };

    return { ok: true, plan, model: MODEL, triggerReason: detection.reason };
  } catch (err) {
    console.warn("[catch-up-generator] generation failed:", err);
    return { ok: false, error: "Couldn't reach the planner right now. Try again." };
  } finally {
    clearTimeout(timeout);
  }
}
