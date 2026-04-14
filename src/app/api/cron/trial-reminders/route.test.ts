import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockCandidates = vi.fn();
const mockFallback = vi.fn();
const mockPurchaseLookup = vi.fn();
const mockRoleLookup = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          select: vi.fn(() => ({
            is: vi.fn(() => {
              const chain: Record<string, unknown> = {};
              chain.gte = vi.fn(() => ({
                lte: vi.fn(() => mockCandidates()),
              }));
              chain.is = vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => mockFallback()),
                })),
              }));
              return chain;
            }),
          })),
          update: vi.fn(() => ({
            eq: (...args: unknown[]) => mockUpdate(...args),
          })),
        };
      }
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
      // user_roles
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: mockRoleLookup,
              })),
            })),
          })),
        })),
      };
    }),
  }),
}));

const mockLogCron = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cron-logger", () => ({
  logCronExecution: (...args: unknown[]) => mockLogCron(...args),
}));

const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockPrefs = vi.fn();
vi.mock("@/lib/email-preferences", () => ({
  getEmailPreferences: (...args: unknown[]) => mockPrefs(...args),
  emailFooterHtml: vi.fn(() => "<footer/>"),
}));

const mockGetUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    }),
}));

import { GET } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/trial-reminders", { method: "GET", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  mockCandidates.mockResolvedValue({ data: [] });
  mockFallback.mockResolvedValue({ data: [] });
  mockPurchaseLookup.mockResolvedValue({ data: null });
  mockRoleLookup.mockResolvedValue({ data: null });
  mockPrefs.mockResolvedValue({
    unsubscribed_all: false,
    lifecycle_emails: true,
    unsubscribe_token: "tok",
  });
  mockGetUser.mockResolvedValue({
    primaryEmailAddress: { emailAddress: "user@example.com" },
  });
  mockUpdate.mockResolvedValue({ error: null });
});

describe("GET /api/cron/trial-reminders", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await GET(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns zero-counts when no candidates match", async () => {
    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidatesConsidered).toBe(0);
    expect(body.emailsSent).toBe(0);
  });

  it("skips candidates with an active paid purchase", async () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
    mockCandidates.mockResolvedValue({
      data: [
        {
          id: "w1",
          user_id: "u1",
          partner1_name: "Alice",
          partner2_name: "Bob",
          trial_started_at: elevenDaysAgo,
          created_at: elevenDaysAgo,
        },
      ],
    });
    mockPurchaseLookup.mockResolvedValue({ data: { id: "purchase_1" } });

    const res = await GET(cronReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.skippedPaid).toBe(1);
    expect(body.emailsSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips candidates with a privileged (admin/beta) role", async () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
    mockCandidates.mockResolvedValue({
      data: [
        {
          id: "w1",
          user_id: "u1",
          partner1_name: "Alice",
          partner2_name: "Bob",
          trial_started_at: elevenDaysAgo,
          created_at: elevenDaysAgo,
        },
      ],
    });
    mockRoleLookup.mockResolvedValue({ data: { role: "beta" } });

    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect((await res.json()).skippedPrivileged).toBe(1);
  });

  it("skips unsubscribed candidates", async () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
    mockCandidates.mockResolvedValue({
      data: [
        {
          id: "w1",
          user_id: "u1",
          partner1_name: "Alice",
          partner2_name: "Bob",
          trial_started_at: elevenDaysAgo,
          created_at: elevenDaysAgo,
        },
      ],
    });
    mockPrefs.mockResolvedValue({
      unsubscribed_all: false,
      lifecycle_emails: false,
      unsubscribe_token: "tok",
    });

    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect((await res.json()).skippedUnsubscribed).toBe(1);
  });

  it("sends the reminder email and marks the wedding as reminded", async () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
    mockCandidates.mockResolvedValue({
      data: [
        {
          id: "w1",
          user_id: "u1",
          partner1_name: "Alice",
          partner2_name: "Bob",
          trial_started_at: elevenDaysAgo,
          created_at: elevenDaysAgo,
        },
      ],
    });

    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailsSent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" })
    );
    expect(mockUpdate).toHaveBeenCalled();
  });
});
