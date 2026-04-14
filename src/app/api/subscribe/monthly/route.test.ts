import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
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

const mockPurchaseLookup = vi.fn();
const mockWeddingLookup = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "subscriber_purchases") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: mockPurchaseLookup,
                })),
              })),
            })),
          })),
        };
      }
      // weddings
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockWeddingLookup,
          })),
        })),
      };
    }),
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

function req(): Request {
  return new Request("http://localhost/api/subscribe/monthly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  process.env = { ...ORIGINAL_ENV };
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID = "price_test_monthly";
  process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockPurchaseLookup.mockResolvedValue({ data: null, error: null });
  mockWeddingLookup.mockResolvedValue({ data: { id: "wedding_456" }, error: null });
  mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/abc" });
});

// ─── POST /api/subscribe/monthly ──────────────────────────────────

describe("POST /api/subscribe/monthly", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, retryAfter: 30 });
    const res = await POST(req());
    expect(res.status).toBe(429);
  });

  it("returns 500 when STRIPE_PRO_MONTHLY_PRICE_ID is unset", async () => {
    delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/not configured/i);
  });

  it("returns 400 when the user already has an active plan", async () => {
    mockPurchaseLookup.mockResolvedValueOnce({
      data: { id: "purchase_1", plan: "lifetime" },
      error: null,
    });
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already have an active plan/i);
  });

  it("creates a Stripe subscription checkout with the monthly price", async () => {
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout.stripe.com/c/abc");

    expect(mockCreateSession).toHaveBeenCalledOnce();
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([
      { price: "price_test_monthly", quantity: 1 },
    ]);
    expect(params.metadata).toEqual(
      expect.objectContaining({
        user_id: "user_123",
        wedding_id: "wedding_456",
        type: "pro_monthly_subscription",
      })
    );
    expect(params.subscription_data.metadata.type).toBe("pro_monthly_subscription");
    expect(params.success_url).toContain("/dashboard?subscribed=monthly");
  });

  it("works even when the user has no wedding (wedding_id becomes empty string in metadata)", async () => {
    mockWeddingLookup.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(req());
    expect(res.status).toBe(200);
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.metadata.wedding_id).toBe("");
  });

  it("passes client_reference_id=userId so Stripe can correlate the session", async () => {
    await POST(req());
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.client_reference_id).toBe("user_123");
  });

  it("enables Stripe promotion codes", async () => {
    await POST(req());
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.allow_promotion_codes).toBe(true);
  });
});
