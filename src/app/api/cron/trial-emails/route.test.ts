import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockWeddingsResult = vi.fn();
const mockPurchaseResult = vi.fn();
const mockScheduledResult = vi.fn();
const mockEmailLogResult = vi.fn();
const mockInsertResult = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => mockWeddingsResult()),
            })),
          })),
        };
      }
      if (table === "subscriber_purchases") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: mockPurchaseResult,
                })),
              })),
            })),
          })),
        };
      }
      if (table === "scheduled_subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: mockScheduledResult,
                })),
              })),
            })),
          })),
        };
      }
      // trial_email_log
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockEmailLogResult,
            })),
          })),
        })),
        insert: vi.fn(() => mockInsertResult()),
      };
    }),
  }),
}));

const mockGetUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    }),
}));

const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/email-trial", () => ({
  getTrialEmail: vi.fn((type: string) => ({
    subject: `[test] ${type}`,
    html: `<p>${type}</p>`,
  })),
}));

const mockCapture = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analytics-server", () => ({
  captureServer: (...args: unknown[]) => mockCapture(...args),
}));

import { POST } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/trial-emails", {
    method: "POST",
    headers,
  });
}

function userWithEmail(email: string) {
  return {
    primaryEmailAddressId: "eml_1",
    emailAddresses: [{ id: "eml_1", emailAddress: email }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  mockWeddingsResult.mockResolvedValue({ data: [] });
  mockPurchaseResult.mockResolvedValue({ data: null });
  mockScheduledResult.mockResolvedValue({ data: null });
  mockEmailLogResult.mockResolvedValue({ data: null });
  mockGetUser.mockResolvedValue(userWithEmail("user@example.com"));
});

describe("POST /api/cron/trial-emails", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns zero counts when there are no trials in range", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      day_10_save_card: 0,
      day_14_renews_today: 0,
      day_14_downgraded: 0,
    });
  });

  it("skips users who already have an active purchase", async () => {
    mockWeddingsResult
      .mockResolvedValueOnce({
        data: [
          { id: "w1", user_id: "u1", partner1_name: "Alice", trial_started_at: null, created_at: new Date().toISOString() },
        ],
      })
      .mockResolvedValue({ data: [] });
    mockPurchaseResult.mockResolvedValue({ data: { id: "purchase_1" } });

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends day_10_save_card to users without a scheduled subscription", async () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const tenDaysAgo = new Date(Date.now() - 10 * DAY_MS).toISOString();
    // Only return a wedding for the day-10 query (first call), empty after that.
    mockWeddingsResult
      .mockResolvedValueOnce({
        data: [
          { id: "w1", user_id: "u1", partner1_name: "Alice", trial_started_at: tenDaysAgo, created_at: tenDaysAgo },
        ],
      })
      .mockResolvedValue({ data: [] });
    mockPurchaseResult.mockResolvedValue({ data: null });
    mockScheduledResult.mockResolvedValue({ data: null }); // no card saved
    mockEmailLogResult.mockResolvedValue({ data: null });

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.day_10_save_card).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" })
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "u1",
      "trial_email_sent",
      expect.objectContaining({ email_type: "day_10_save_card" })
    );
  });

  it("skips users who have already been sent the same email type", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockWeddingsResult
      .mockResolvedValueOnce({
        data: [
          { id: "w1", user_id: "u1", partner1_name: "Alice", trial_started_at: tenDaysAgo, created_at: tenDaysAgo },
        ],
      })
      .mockResolvedValue({ data: [] });
    mockEmailLogResult.mockResolvedValue({ data: { user_id: "u1" } });

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips users whose card-saved status doesn't match the email's requirement", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockWeddingsResult
      .mockResolvedValueOnce({
        data: [
          { id: "w1", user_id: "u1", partner1_name: "Alice", trial_started_at: tenDaysAgo, created_at: tenDaysAgo },
        ],
      })
      .mockResolvedValue({ data: [] });
    // day_10_save_card requires NO scheduled row — we provide one, so it's skipped.
    mockScheduledResult.mockResolvedValue({ data: { id: "sched_1" } });

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips users whose Clerk lookup fails", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    mockWeddingsResult
      .mockResolvedValueOnce({
        data: [
          { id: "w1", user_id: "u1", partner1_name: "Alice", trial_started_at: tenDaysAgo, created_at: tenDaysAgo },
        ],
      })
      .mockResolvedValue({ data: [] });
    mockGetUser.mockRejectedValue(new Error("clerk 404"));

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
