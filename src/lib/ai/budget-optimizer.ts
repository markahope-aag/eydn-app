/**
 * AI budget optimizer.
 *
 * Detects when one or more wedding budget categories have gone
 * meaningfully over their estimated allocation, then asks Claude for a
 * prioritized set of reallocation or cut suggestions. Same shape as the
 * catch-up plans feature: a pure detection function + an async
 * generator that returns a typed result or a user-facing error.
 */

import { getClaudeClient } from "./claude-client";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 20_000;

export const BUDGET_THRESHOLDS = {
  /** Category is "over" when (actual/committed - estimated) / estimated >= 0.2 */
  OVER_PCT: 0.2,
  /** Minimum estimated value to even consider a category (ignore empty ones) */
  MIN_ESTIMATED: 100,
} as const;

export type ExpenseInput = {
  description: string;
  category: string;
  estimated: number;
  amount_paid: number;
  final_cost: number | null;
  paid: boolean;
};

export type BudgetWeddingContext = {
  partner1_name: string | null;
  partner2_name: string | null;
  wedding_date: string | null;
  budget: number | null;
  guest_count_estimate: number | null;
};

export type CategorySummary = {
  category: string;
  estimated: number;
  committed: number; // actual spend signal: max of amount_paid, final_cost, estimated across rows
  overAmount: number; // committed - estimated (can be negative for under-budget)
  overPct: number; // overAmount / estimated (0 when estimated == 0)
};

export type BudgetDetection =
  | { triggered: false; categories: CategorySummary[] }
  | { triggered: true; reason: string; categories: CategorySummary[]; overCategories: CategorySummary[] };

/**
 * Roll expenses up by category and compute over/under per category.
 * Committed spend is the strongest signal available per row — final_cost
 * beats amount_paid beats estimated. Sum those per category and compare
 * to the sum of estimated allocations.
 */
function summarize(expenses: ExpenseInput[]): CategorySummary[] {
  const map = new Map<string, { estimated: number; committed: number }>();
  for (const e of expenses) {
    const cur = map.get(e.category) ?? { estimated: 0, committed: 0 };
    cur.estimated += e.estimated || 0;
    const committedRow = Math.max(e.final_cost ?? 0, e.amount_paid || 0, e.estimated || 0);
    cur.committed += committedRow;
    map.set(e.category, cur);
  }
  const out: CategorySummary[] = [];
  for (const [category, { estimated, committed }] of map) {
    const overAmount = committed - estimated;
    const overPct = estimated > 0 ? overAmount / estimated : 0;
    out.push({ category, estimated, committed, overAmount, overPct });
  }
  return out;
}

export function shouldTriggerBudget(expenses: ExpenseInput[]): BudgetDetection {
  const categories = summarize(expenses);
  const over = categories.filter(
    (c) => c.estimated >= BUDGET_THRESHOLDS.MIN_ESTIMATED && c.overPct >= BUDGET_THRESHOLDS.OVER_PCT
  );
  if (over.length === 0) return { triggered: false, categories };

  const worst = over.slice().sort((a, b) => b.overPct - a.overPct)[0];
  const reason = over.length === 1
    ? `${worst.category} is ${Math.round(worst.overPct * 100)}% over budget`
    : `${over.length} categories over budget (worst: ${worst.category}, ${Math.round(worst.overPct * 100)}% over)`;

  return { triggered: true, reason, categories, overCategories: over };
}

export type BudgetSuggestion = {
  title: string;
  why: string;
  action: string;
};

export type BudgetOptimization = {
  summary: string;
  suggestions: BudgetSuggestion[];
};

function buildPrompt(
  expenses: ExpenseInput[],
  ctx: BudgetWeddingContext,
  detection: Extract<BudgetDetection, { triggered: true }>
): string {
  const details: string[] = [];
  if (ctx.partner1_name && ctx.partner2_name) details.push(`Couple: ${ctx.partner1_name} & ${ctx.partner2_name}`);
  if (ctx.wedding_date) details.push(`Wedding date: ${ctx.wedding_date}`);
  if (ctx.guest_count_estimate) details.push(`Guest count: ~${ctx.guest_count_estimate}`);
  if (ctx.budget) details.push(`Total budget: $${ctx.budget.toLocaleString()}`);

  const rollup = detection.categories
    .sort((a, b) => b.overPct - a.overPct)
    .map((c) => {
      const pctLabel = c.estimated > 0 ? `${Math.round(c.overPct * 100)}%` : "—";
      const state = c.overPct >= BUDGET_THRESHOLDS.OVER_PCT ? "OVER" : c.overPct <= -0.1 ? "UNDER" : "ok";
      return `- ${c.category}: $${c.estimated.toLocaleString()} est / $${c.committed.toLocaleString()} committed (${pctLabel}, ${state})`;
    })
    .join("\n");

  // Include the biggest line items in over-budget categories so Claude has
  // concrete things to suggest cutting.
  const overCategories = new Set(detection.overCategories.map((c) => c.category));
  const bigLines = expenses
    .filter((e) => overCategories.has(e.category))
    .sort((a, b) => {
      const aVal = Math.max(a.final_cost ?? 0, a.amount_paid || 0, a.estimated || 0);
      const bVal = Math.max(b.final_cost ?? 0, b.amount_paid || 0, b.estimated || 0);
      return bVal - aVal;
    })
    .slice(0, 10)
    .map((e) => {
      const val = Math.max(e.final_cost ?? 0, e.amount_paid || 0, e.estimated || 0);
      return `- ${e.category}: ${e.description} — $${val.toLocaleString()}${e.paid ? " (paid)" : ""}`;
    })
    .join("\n");

  return `You are Eydn, a wedding planner helping a couple rebalance their budget.

${details.join("\n")}

Trigger: ${detection.reason}.

Category rollup:
${rollup}

Biggest line items in over-budget categories:
${bigLines || "(none)"}

Suggest 2-5 concrete actions to get back on track. Prefer reallocation over cuts where possible (e.g., shift from an under-budget category). When cuts are needed, name specific line items. For each suggestion:
- title: short imperative ("Reallocate $800 from photography to florals")
- why: 1-2 sentences explaining the tradeoff
- action: what the couple should do this week ("Talk to your photographer about a smaller package")

Also include a 2-3 sentence "summary" that frames the situation honestly but kindly — this isn't a failure, it's a normal rebalancing.

Respond with ONLY this JSON, no prose before or after:
{"summary": "...", "suggestions": [{"title": "...", "why": "...", "action": "..."}, ...]}`;
}

function parseOptimization(raw: string): BudgetOptimization | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed !== "object" || parsed === null ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.suggestions)
    ) {
      return null;
    }
    const suggestions: BudgetSuggestion[] = [];
    for (const s of parsed.suggestions) {
      if (
        typeof s === "object" && s !== null &&
        typeof s.title === "string" &&
        typeof s.why === "string" &&
        typeof s.action === "string"
      ) {
        suggestions.push({ title: s.title, why: s.why, action: s.action });
      }
    }
    if (suggestions.length === 0) return null;
    return { summary: parsed.summary, suggestions };
  } catch {
    return null;
  }
}

export type GenerateResult =
  | { ok: true; optimization: BudgetOptimization; model: string; triggerReason: string }
  | { ok: false; error: string };

export async function generateBudgetOptimization(
  expenses: ExpenseInput[],
  ctx: BudgetWeddingContext,
  detection: Extract<BudgetDetection, { triggered: true }>
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
        messages: [{ role: "user", content: buildPrompt(expenses, ctx, detection) }],
      },
      { signal: controller.signal }
    );

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    const optimization = parseOptimization(text);
    if (!optimization) return { ok: false, error: "Got an unexpected response. Try again." };

    return { ok: true, optimization, model: MODEL, triggerReason: detection.reason };
  } catch (err) {
    console.warn("[budget-optimizer] generation failed:", err);
    return { ok: false, error: "Couldn't reach the planner right now. Try again." };
  } finally {
    clearTimeout(timeout);
  }
}
