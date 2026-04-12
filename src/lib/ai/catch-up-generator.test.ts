import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("./claude-client", () => ({
  getClaudeClient: () => ({
    messages: { create: mockCreate },
  }),
}));

import {
  shouldTriggerCatchUp,
  generateCatchUpPlan,
  CATCH_UP_THRESHOLDS,
  type CatchUpTaskInput,
  type CatchUpWeddingContext,
} from "./catch-up-generator";

const weddingCtx: CatchUpWeddingContext = {
  partner1_name: "Alex",
  partner2_name: "Jordan",
  wedding_date: "2026-10-15",
  venue: "The Old Mill",
  venue_city: "Milwaukee",
  budget: 30000,
  guest_count_estimate: 120,
  style_description: "Garden casual",
};

function overdueTask(title: string, daysAgo = 10): CatchUpTaskInput {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    title,
    category: "Planning",
    due_date: d.toISOString().split("T")[0],
    completed: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("shouldTriggerCatchUp", () => {
  it("does not trigger when overdue count is below the threshold", () => {
    const tasks = Array.from({ length: CATCH_UP_THRESHOLDS.OVERDUE_TASKS - 1 }, (_, i) =>
      overdueTask(`Task ${i}`)
    );
    const result = shouldTriggerCatchUp(tasks);
    expect(result.triggered).toBe(false);
  });

  it("triggers when overdue count reaches the threshold", () => {
    const tasks = Array.from({ length: CATCH_UP_THRESHOLDS.OVERDUE_TASKS }, (_, i) =>
      overdueTask(`Task ${i}`)
    );
    const result = shouldTriggerCatchUp(tasks);
    expect(result.triggered).toBe(true);
    if (result.triggered) {
      expect(result.overdueCount).toBe(CATCH_UP_THRESHOLDS.OVERDUE_TASKS);
      expect(result.reason).toContain(`${CATCH_UP_THRESHOLDS.OVERDUE_TASKS} overdue tasks`);
    }
  });

  it("ignores tasks with no due date", () => {
    const tasks: CatchUpTaskInput[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Task ${i}`,
      category: null,
      due_date: null,
      completed: false,
    }));
    const result = shouldTriggerCatchUp(tasks);
    expect(result.triggered).toBe(false);
  });

  it("ignores completed tasks even if past their due date", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      ...overdueTask(`Task ${i}`),
      completed: true,
    }));
    const result = shouldTriggerCatchUp(tasks);
    expect(result.triggered).toBe(false);
  });

  it("does not trigger on future-dated incomplete tasks", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const tasks: CatchUpTaskInput[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Task ${i}`,
      category: null,
      due_date: future.toISOString().split("T")[0],
      completed: false,
    }));
    const result = shouldTriggerCatchUp(tasks);
    expect(result.triggered).toBe(false);
  });
});

describe("generateCatchUpPlan", () => {
  const detection = {
    triggered: true as const,
    reason: "6 overdue tasks",
    overdueCount: 6,
  };
  const overdueTasks = Array.from({ length: 6 }, (_, i) => overdueTask(`Task ${i}`));

  it("returns ok=false with error when API key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not configured/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns a parsed plan on a valid Claude response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "You're behind on vendor bookings — let's focus on the three that matter most this week.",
            priorities: [
              { title: "Lock in your photographer", why: "Peak-season photographers book out fast.", when: "Within 3 days" },
              { title: "Send out save-the-dates", why: "Guests need travel lead time.", when: "This weekend" },
              { title: "Finalize venue contract", why: "Everything downstream depends on this.", when: "Within 5 days" },
            ],
          }),
        },
      ],
    });

    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.summary).toMatch(/behind/);
      expect(result.plan.priorities).toHaveLength(3);
      expect(result.plan.priorities[0].title).toBe("Lock in your photographer");
      expect(result.triggerReason).toBe("6 overdue tasks");
    }
  });

  it("tolerates markdown code fences", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text:
            '```json\n{"summary":"ok","priorities":[{"title":"t","why":"w","when":"now"}]}\n```',
        },
      ],
    });

    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(true);
  });

  it("returns ok=false on malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json at all" }],
    });

    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(false);
  });

  it("returns ok=false when priorities is empty", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ summary: "nothing to do", priorities: [] }),
        },
      ],
    });

    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(false);
  });

  it("filters invalid priority items but keeps valid ones", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "ok",
            priorities: [
              { title: "Valid", why: "yes", when: "now" },
              { title: "Missing why", when: "now" },
              null,
              { title: 123, why: "bad type", when: "now" },
            ],
          }),
        },
      ],
    });

    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.priorities).toHaveLength(1);
      expect(result.plan.priorities[0].title).toBe("Valid");
    }
  });

  it("returns ok=false when Claude throws", async () => {
    mockCreate.mockRejectedValue(new Error("network"));
    const result = await generateCatchUpPlan(overdueTasks, weddingCtx, detection);
    expect(result.ok).toBe(false);
  });
});
