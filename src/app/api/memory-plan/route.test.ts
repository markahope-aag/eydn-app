import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockWeddingLookup = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockWeddingLookup,
        })),
      })),
    })),
  }),
}));

const mockCreateSession = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCreateSession(...args),
      },
    },
  }),
}));

import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockWeddingLookup.mockResolvedValue({
    data: {
      id: "wed_1",
      phase: "active",
      memory_plan_active: false,
      memory_plan_expires_at: null,
    },
  });
  mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/memory" });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/memory-plan", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when no wedding exists", async () => {
    mockWeddingLookup.mockResolvedValue({ data: null });
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns the memory plan status for an active wedding", async () => {
    mockWeddingLookup.mockResolvedValue({
      data: {
        phase: "post_wedding",
        memory_plan_active: true,
        memory_plan_expires_at: "2027-01-01T00:00:00Z",
      },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      active: true,
      expiresAt: "2027-01-01T00:00:00Z",
      phase: "post_wedding",
    });
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/memory-plan", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 404 when no wedding exists", async () => {
    mockWeddingLookup.mockResolvedValue({ data: null });
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("returns 400 when memory plan is already active", async () => {
    mockWeddingLookup.mockResolvedValue({
      data: { id: "wed_1", memory_plan_active: true },
    });
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("creates a Stripe subscription checkout session", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout.stripe.com/c/memory");

    const params = mockCreateSession.mock.calls[0][0];
    expect(params.mode).toBe("subscription");
    expect(params.line_items[0].price_data.unit_amount).toBe(2900);
    expect(params.line_items[0].price_data.recurring.interval).toBe("year");
    expect(params.metadata).toMatchObject({
      user_id: "user_123",
      wedding_id: "wed_1",
      type: "memory_plan",
    });
  });
});
