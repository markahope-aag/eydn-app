import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockRoleLookup = vi.fn();
const mockPurchaseLookup = vi.fn();
const mockCountResult = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn((_cols: string, opts?: { count?: string; head?: boolean }) => {
        // Count query: .select("*", { count: "exact", head: true }).eq("role", "beta")
        if (opts?.count === "exact") {
          return {
            eq: vi.fn(() => mockCountResult()),
          };
        }
        // role lookup: .select("role").eq("user_id").in("role", [...]).limit(1).single()
        return {
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: mockRoleLookup,
              })),
            })),
            // purchase lookup: .select("id").eq("user_id").eq("status").limit(1).single()
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: mockPurchaseLookup,
              })),
            })),
          })),
        };
      }),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    })),
  }),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false });
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockRoleLookup.mockResolvedValue({ data: null });
  mockPurchaseLookup.mockResolvedValue({ data: null });
  mockCountResult.mockResolvedValue({ count: 10 });
  mockUpsert.mockResolvedValue({ error: null });
});

describe("POST /api/beta/claim", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true });
    const res = await POST();
    expect(res.status).toBe(429);
  });

  it("returns success:already when user already has a beta or admin role", async () => {
    mockRoleLookup.mockResolvedValueOnce({ data: { role: "beta" } });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, already: true });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns success:already when user already has an active purchase", async () => {
    mockPurchaseLookup.mockResolvedValueOnce({ data: { id: "purchase_1" } });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, already: true });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 409 when beta is full", async () => {
    mockCountResult.mockResolvedValueOnce({ count: 50 });
    const res = await POST();
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ beta_full: true });
  });

  it("assigns the beta role on success", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith({ user_id: "user_123", role: "beta" });
  });

  it("returns 500 when the upsert errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpsert.mockResolvedValueOnce({ error: { message: "db down" } });
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
