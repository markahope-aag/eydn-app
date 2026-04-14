import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockWeek = vi.fn();
const mockCumulative = vi.fn();
const mockPaid = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "weddings") {
        // Two distinct select paths — count week and count cumulative.
        return {
          select: vi.fn(() => {
            // Return both chains; the route calls .gte() only on the first call.
            const chain = {
              gte: vi.fn(() => mockWeek()),
              then: (resolve: (v: unknown) => void) => resolve(mockCumulative()),
            };
            return chain;
          }),
        };
      }
      // subscriber_purchases
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => mockPaid()),
          })),
        })),
      };
    }),
  }),
}));

const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockChargesList = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    charges: {
      list: (...args: unknown[]) => mockChargesList(...args),
    },
  }),
}));

// Mute the PostHog fetch path — no personal API key → returns [] immediately.
const originalFetch = global.fetch;

import { POST } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/weekly-conversion-report", {
    method: "POST",
    headers,
  });
}

async function* emptyCharges() {
  // no charges
}

async function* sampleCharges() {
  yield { paid: true, refunded: false, amount: 4900 };
  yield { paid: true, refunded: false, amount: 2900 };
  yield { paid: false, refunded: false, amount: 1000 }; // not paid
  yield { paid: true, refunded: true, amount: 500 }; // refunded
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  delete process.env.BACKUP_SECRET;
  delete process.env.POSTHOG_PERSONAL_API_KEY;
  delete process.env.POSTHOG_PROJECT_ID;
  process.env.ADMIN_EMAILS = "ops@eydn.app,backup@eydn.app";
  mockWeek.mockResolvedValue({ count: 12 });
  mockCumulative.mockResolvedValue({ count: 420 });
  mockPaid.mockResolvedValue({
    data: [
      { plan: "lifetime", amount: 4900, purchased_at: "2026-04-10T00:00:00Z" },
      { plan: "pro_monthly", amount: 2900, purchased_at: "2026-04-11T00:00:00Z" },
      { plan: "pro_monthly", amount: 2900, purchased_at: "2026-04-12T00:00:00Z" },
    ],
  });
  mockChargesList.mockReturnValue(sampleCharges());
  global.fetch = originalFetch;
});

describe("POST /api/cron/weekly-conversion-report", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns 500 when ADMIN_EMAILS is not configured", async () => {
    delete process.env.ADMIN_EMAILS;
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });

  it("emails the first ADMIN_EMAILS recipient with the summary", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("ops@eydn.app");
    expect(call.subject).toMatch(/Eydn weekly/);
    // Body contains the counts
    expect(call.html).toContain("12"); // trial signups week
    expect(call.html).toContain("420"); // cumulative
  });

  it("counts paid conversions by plan correctly", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.lifetimeCount).toBe(1);
    expect(body.monthlyCount).toBe(2);
  });

  it("sums paid non-refunded Stripe charges for weekly revenue", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    const body = await res.json();
    // 4900 + 2900 = 7800 cents → $78
    expect(body.revenue).toBe(78);
  });

  it("returns revenue=0 when Stripe throws", async () => {
    mockChargesList.mockImplementation(() => {
      throw new Error("stripe down");
    });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect((await res.json()).revenue).toBe(0);
  });

  it("handles zero paid conversions", async () => {
    mockPaid.mockResolvedValueOnce({ data: [] });
    mockChargesList.mockReturnValue(emptyCharges());
    const res = await POST(cronReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.lifetimeCount).toBe(0);
    expect(body.monthlyCount).toBe(0);
    expect(body.revenue).toBe(0);
  });
});
