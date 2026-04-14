import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockMaybeSingle = vi.fn();
const mockUpdateResult = vi.fn();

// Capture update builder calls so we can assert what was written.
const updateCalls: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = [];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      // SELECT chain used by GET
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        })),
      })),
      // UPDATE chain used by PATCH
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
    })),
  }),
}));

import { GET, PATCH } from "./route";

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/subscribe/scheduled", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockUpdateResult.mockReturnValue({ error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/subscribe/scheduled", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns null when the user has no pending row", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns the pending row when one exists", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "sched_1",
        plan: "pro_monthly",
        scheduled_for: "2026-05-01T00:00:00Z",
        status: "pending",
      },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "sched_1", plan: "pro_monthly" });
  });
});

// ─── PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/subscribe/scheduled", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await PATCH(patchReq({ action: "cancel" }));
    expect(res.status).toBe(401);
  });

  it("cancels the pending row", async () => {
    const res = await PATCH(patchReq({ action: "cancel" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].values.status).toBe("cancelled");
    expect(updateCalls[0].filters).toContainEqual(["user_id", "user_123"]);
    expect(updateCalls[0].filters).toContainEqual(["status", "pending"]);
  });

  it("switches the plan to lifetime", async () => {
    const res = await PATCH(patchReq({ action: "switch_plan", plan: "lifetime" }));
    expect(res.status).toBe(200);
    expect(updateCalls[0].values.plan).toBe("lifetime");
  });

  it("switches the plan to pro_monthly", async () => {
    const res = await PATCH(patchReq({ action: "switch_plan", plan: "pro_monthly" }));
    expect(res.status).toBe(200);
    expect(updateCalls[0].values.plan).toBe("pro_monthly");
  });

  it("rejects a switch_plan call with an invalid plan", async () => {
    const res = await PATCH(patchReq({ action: "switch_plan", plan: "sketchy" }));
    expect(res.status).toBe(400);
    expect(updateCalls).toHaveLength(0);
  });

  it("rejects an unknown action", async () => {
    const res = await PATCH(patchReq({ action: "nuke" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the cancel update fails", async () => {
    mockUpdateResult.mockReturnValueOnce({ error: { message: "db down" } });
    const res = await PATCH(patchReq({ action: "cancel" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("db down");
  });
});
