import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetStatus = vi.fn();
vi.mock("@/lib/subscription", () => ({
  getSubscriptionStatus: () => mockGetStatus(),
}));

const mockGetMeter = vi.fn();
vi.mock("@/lib/tool-call-counter", () => ({
  getToolCallMeter: (...args: unknown[]) => mockGetMeter(...args),
}));

const mockResolve = vi.fn();
vi.mock("@/lib/auth", () => ({
  resolveWeddingForUserId: (...args: unknown[]) => mockResolve(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({}),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockGetStatus.mockResolvedValue({
    tier: "trial",
    trialExpired: false,
    features: { aiChat: true },
  });
  mockGetMeter.mockResolvedValue({ used: 4, limit: 100, remaining: 96 });
  mockResolve.mockResolvedValue({ wedding: { id: "wed_1" }, role: "owner" });
});

describe("GET /api/subscription-status", () => {
  it("merges subscription status with a tool-call meter for signed-in users", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe("trial");
    expect(body.features.aiChat).toBe(true);
    expect(body.toolCalls).toEqual({ used: 4, limit: 100, remaining: 96 });
    expect(body.role).toBe("owner");
    expect(mockGetMeter).toHaveBeenCalledWith("user_123", "trial");
  });

  it("reports the read-only parent role", async () => {
    mockResolve.mockResolvedValue({ wedding: { id: "wed_1" }, role: "parent" });
    const res = await GET();
    const body = await res.json();
    expect(body.role).toBe("parent");
  });

  it("returns a zeroed meter for unauthenticated callers", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.toolCalls).toEqual({ used: 0, limit: null, remaining: null });
    expect(mockGetMeter).not.toHaveBeenCalled();
  });
});
