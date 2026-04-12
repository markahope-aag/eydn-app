import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("./claude-client", () => ({
  getClaudeClient: () => ({
    messages: { create: mockCreate },
  }),
}));

import {
  shouldTriggerBudget,
  generateBudgetOptimization,
  BUDGET_THRESHOLDS,
  type ExpenseInput,
  type BudgetWeddingContext,
} from "./budget-optimizer";

const weddingCtx: BudgetWeddingContext = {
  partner1_name: "Alex",
  partner2_name: "Jordan",
  wedding_date: "2026-10-15",
  budget: 30000,
  guest_count_estimate: 120,
};

function row(category: string, estimated: number, actual: number, description = "item"): ExpenseInput {
  return {
    description,
    category,
    estimated,
    amount_paid: actual,
    final_cost: null,
    paid: actual > 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("shouldTriggerBudget", () => {
  it("does not trigger when every category is at or below estimated", () => {
    const expenses = [
      row("Photography", 3000, 2800),
      row("Flowers", 2000, 1500),
      row("Catering", 10000, 9500),
    ];
    const result = shouldTriggerBudget(expenses);
    expect(result.triggered).toBe(false);
  });

  it("triggers when a category exceeds the over-pct threshold", () => {
    const expenses = [
      row("Photography", 3000, 3000),
      // Flowers: 2000 est, 2600 committed → 30% over, above 20% threshold
      row("Flowers", 2000, 2600),
    ];
    const result = shouldTriggerBudget(expenses);
    expect(result.triggered).toBe(true);
    if (result.triggered) {
      expect(result.overCategories).toHaveLength(1);
      expect(result.overCategories[0].category).toBe("Flowers");
      expect(result.reason).toContain("Flowers");
      expect(result.reason).toContain("30%");
    }
  });

  it("does not trigger on tiny categories below the min-estimated floor", () => {
    const expenses = [
      // Tip jar: $50 est, $80 committed → 60% over but below MIN_ESTIMATED
      row("Tips", 50, 80),
    ];
    const result = shouldTriggerBudget(expenses);
    expect(result.triggered).toBe(false);
  });

  it("surfaces multiple over-budget categories and picks the worst in the reason", () => {
    const expenses = [
      row("Photography", 3000, 3800), // ~27% over
      row("Flowers", 2000, 3000), // 50% over
      row("Catering", 10000, 11000), // 10% over (below threshold)
    ];
    const result = shouldTriggerBudget(expenses);
    expect(result.triggered).toBe(true);
    if (result.triggered) {
      expect(result.overCategories.length).toBe(2);
      expect(result.reason).toContain("Flowers");
      expect(result.reason).toContain("50%");
    }
  });

  it("uses final_cost when present as the committed signal", () => {
    const expenses: ExpenseInput[] = [
      {
        description: "Venue",
        category: "Venue",
        estimated: 5000,
        amount_paid: 1000,
        final_cost: 7000, // final cost confirms over-budget
        paid: false,
      },
    ];
    const result = shouldTriggerBudget(expenses);
    expect(result.triggered).toBe(true);
    if (result.triggered) {
      expect(result.overCategories[0].committed).toBe(7000);
    }
  });

  it("threshold constants match expectations", () => {
    expect(BUDGET_THRESHOLDS.OVER_PCT).toBe(0.2);
    expect(BUDGET_THRESHOLDS.MIN_ESTIMATED).toBe(100);
  });
});

describe("generateBudgetOptimization", () => {
  const detection = {
    triggered: true as const,
    reason: "Flowers is 30% over budget",
    categories: [
      { category: "Flowers", estimated: 2000, committed: 2600, overAmount: 600, overPct: 0.3 },
      { category: "Photography", estimated: 3000, committed: 2500, overAmount: -500, overPct: -0.17 },
    ],
    overCategories: [
      { category: "Flowers", estimated: 2000, committed: 2600, overAmount: 600, overPct: 0.3 },
    ],
  };
  const expenses = [row("Flowers", 2000, 2600, "Bridal bouquet"), row("Photography", 3000, 2500)];

  it("returns ok=false when API key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await generateBudgetOptimization(expenses, weddingCtx, detection);
    expect(result.ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("parses a valid Claude response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "You're 30% over on flowers — let's rebalance from photography.",
            suggestions: [
              {
                title: "Shift $500 from photography to flowers",
                why: "You're under budget on photography and over on flowers.",
                action: "Update the allocation in your budget tracker this week.",
              },
            ],
          }),
        },
      ],
    });

    const result = await generateBudgetOptimization(expenses, weddingCtx, detection);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.optimization.suggestions).toHaveLength(1);
      expect(result.optimization.suggestions[0].title).toContain("photography");
    }
  });

  it("falls back on malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });
    const result = await generateBudgetOptimization(expenses, weddingCtx, detection);
    expect(result.ok).toBe(false);
  });

  it("falls back when suggestions array is empty", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ summary: "nothing", suggestions: [] }) }],
    });
    const result = await generateBudgetOptimization(expenses, weddingCtx, detection);
    expect(result.ok).toBe(false);
  });

  it("filters invalid suggestion items", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "ok",
            suggestions: [
              { title: "Valid", why: "yes", action: "do it" },
              { title: "Missing action", why: "yep" },
              null,
            ],
          }),
        },
      ],
    });

    const result = await generateBudgetOptimization(expenses, weddingCtx, detection);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.optimization.suggestions).toHaveLength(1);
  });

  it("returns ok=false when Claude throws", async () => {
    mockCreate.mockRejectedValue(new Error("network"));
    const result = await generateBudgetOptimization(expenses, weddingCtx, detection);
    expect(result.ok).toBe(false);
  });
});
