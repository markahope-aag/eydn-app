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

function req(body?: unknown): Request {
  return new Request("http://localhost/api/subscribe/save-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "",
  });
}

const ORIGINAL_ENV = process.env;
const TRIAL_START = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockPurchaseLookup.mockResolvedValue({ data: null, error: null });
  mockWeddingLookup.mockResolvedValue({
    data: {
      id: "wedding_456",
      trial_started_at: TRIAL_START,
      created_at: TRIAL_START,
    },
    error: null,
  });
  mockCreateSession.mockResolvedValue({
    url: "https://checkout.stripe.com/c/setup",
  });
});

// ─── POST /api/subscribe/save-card ────────────────────────────────

describe("POST /api/subscribe/save-card", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(req({ plan: "pro_monthly" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true });
    const res = await POST(req({ plan: "pro_monthly" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when the user already has an active plan", async () => {
    mockPurchaseLookup.mockResolvedValueOnce({
      data: { id: "purchase_1" },
      error: null,
    });
    const res = await POST(req({ plan: "pro_monthly" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the user has no wedding", async () => {
    mockWeddingLookup.mockResolvedValueOnce({ data: null, error: null });
    const res = await POST(req({ plan: "pro_monthly" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/No wedding/);
  });

  it("creates a setup-mode checkout session with trial_auto_convert metadata", async () => {
    const res = await POST(req({ plan: "pro_monthly" }));

    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout.stripe.com/c/setup");

    expect(mockCreateSession).toHaveBeenCalledOnce();
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.mode).toBe("setup");
    expect(params.payment_method_types).toEqual(["card"]);
    expect(params.metadata.intent).toBe("trial_auto_convert");
    expect(params.metadata.plan).toBe("pro_monthly");
    expect(params.metadata.user_id).toBe("user_123");
    expect(params.metadata.wedding_id).toBe("wedding_456");
    expect(params.setup_intent_data.metadata.intent).toBe("trial_auto_convert");
  });

  it("defaults to pro_monthly when plan is omitted", async () => {
    await POST(req({}));
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.metadata.plan).toBe("pro_monthly");
  });

  it("accepts lifetime as a valid plan choice", async () => {
    await POST(req({ plan: "lifetime" }));
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.metadata.plan).toBe("lifetime");
  });

  it("coerces invalid plan values back to pro_monthly", async () => {
    await POST(req({ plan: "sketchy" }));
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.metadata.plan).toBe("pro_monthly");
  });

  it("schedules the charge for trial_started_at + 14 days", async () => {
    await POST(req({ plan: "pro_monthly" }));
    const params = mockCreateSession.mock.calls[0][0];
    const scheduled = new Date(params.metadata.scheduled_for);
    const expected = new Date(
      new Date(TRIAL_START).getTime() + 14 * 24 * 60 * 60 * 1000
    );
    // Same millisecond — both computed from the same trial_started_at
    expect(scheduled.getTime()).toBe(expected.getTime());
  });

  it("uses the configured app URL for success/cancel redirects", async () => {
    await POST(req({ plan: "pro_monthly" }));
    const params = mockCreateSession.mock.calls[0][0];
    expect(params.success_url).toContain("https://eydn.app/dashboard/billing");
    expect(params.cancel_url).toContain("https://eydn.app/dashboard");
  });
});
