import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockGetSubscriptionStatus = vi.fn();
vi.mock("@/lib/subscription", () => ({
  getSubscriptionStatus: () => mockGetSubscriptionStatus(),
}));

const mockShouldTrigger = vi.fn();
const mockGenerate = vi.fn();
vi.mock("@/lib/ai/budget-optimizer", () => ({
  generateBudgetOptimization: (...args: unknown[]) => mockGenerate(...args),
  shouldTriggerBudget: (...args: unknown[]) => mockShouldTrigger(...args),
}));

const mockOptRow = vi.fn();
const mockExpenseRows = vi.fn();
const mockInsertSingle = vi.fn();
const mockUpdateResult = vi.fn();
const updateCalls: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = [];

function makeSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === "budget_optimizations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: mockOptRow,
                  })),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockInsertSingle,
            })),
          })),
          update: vi.fn((values: Record<string, unknown>) => {
            const entry = { values, filters: [] as Array<[string, unknown]> };
            updateCalls.push(entry);
            const chain = {
              eq: vi.fn((col: string, val: unknown) => {
                entry.filters.push([col, val]);
                return chain;
              }),
              then: (resolve: (v: unknown) => void) => resolve(mockUpdateResult()),
            };
            return chain;
          }),
        };
      }
      // expenses
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: mockExpenseRows,
          })),
        })),
      };
    }),
  };
}

import { GET, POST, PATCH } from "./route";

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/budget-optimize", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1", partner1_name: "A", partner2_name: "B", date: "2026-08-01", budget: 30000, guest_count_estimate: 100 },
    supabase: makeSupabase(),
  });
  mockGetSubscriptionStatus.mockResolvedValue({
    tier: "pro",
    trialExpired: false,
    features: { budgetOptimizer: true },
  });
  mockOptRow.mockResolvedValue({ data: null });
  mockExpenseRows.mockResolvedValue({ data: [] });
  mockShouldTrigger.mockReturnValue({ triggered: true, reason: "over_budget" });
  mockGenerate.mockResolvedValue({
    ok: true,
    triggerReason: "over_budget",
    optimization: { suggestions: ["cut flowers"] },
    model: "claude-opus-4-6",
  });
  mockInsertSingle.mockResolvedValue({ data: { id: "opt_1" }, error: null });
  mockUpdateResult.mockReturnValue({ error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/budget-optimize", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the latest optimization, detection, and canGenerate", async () => {
    mockOptRow.mockResolvedValue({ data: { id: "opt_1", suggestion: {} } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.optimization).toEqual({ id: "opt_1", suggestion: {} });
    expect(body.canGenerate).toBe(true);
    expect(body.tier).toBe("pro");
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/budget-optimize", () => {
  it("returns 403 when the user is not entitled to the feature", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({
      tier: "free",
      trialExpired: true,
      features: { budgetOptimizer: false },
    });
    const res = await POST();
    expect(res.status).toBe(403);
    expect((await res.json()).trialExpired).toBe(true);
  });

  it("returns triggered:false when the detection says nothing to do", async () => {
    mockShouldTrigger.mockReturnValue({ triggered: false });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ triggered: false });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 502 when the LLM generation fails", async () => {
    mockGenerate.mockResolvedValue({ ok: false, error: "anthropic down" });
    const res = await POST();
    expect(res.status).toBe(502);
  });

  it("inserts and returns the new optimization on success", async () => {
    const res = await POST();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.triggered).toBe(true);
    expect(body.optimization).toEqual({ id: "opt_1" });
  });

  it("returns 500 when the insert errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await POST();
    expect(res.status).toBe(500);
  });
});

// ─── PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/budget-optimize", () => {
  it("returns 400 when id is missing", async () => {
    const res = await PATCH(patchReq({}));
    expect(res.status).toBe(400);
  });

  it("dismisses the matching optimization", async () => {
    const res = await PATCH(patchReq({ id: "opt_1" }));
    expect(res.status).toBe(200);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].values).toHaveProperty("dismissed_at");
    expect(updateCalls[0].filters).toContainEqual(["id", "opt_1"]);
    expect(updateCalls[0].filters).toContainEqual(["wedding_id", "wed_1"]);
  });

  it("returns 500 when the dismiss update errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpdateResult.mockReturnValue({ error: { message: "db down" } });
    const res = await PATCH(patchReq({ id: "opt_1" }));
    expect(res.status).toBe(500);
  });
});
