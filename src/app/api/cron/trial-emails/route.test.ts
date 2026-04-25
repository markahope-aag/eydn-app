import { describe, it, expect, beforeEach, vi } from "vitest";

// The route now delegates per-step send/dedup to the generic email-sequences
// runner (tested in src/lib/email-sequences.test.ts). The route-level tests
// here cover only what the route still owns: auth and the candidate-window
// query shape. Per-recipient behavior is verified by the runner's pure-function
// tests + integration tests against real DB (added with the admin UI).

const mockWeddings = vi.fn();
const mockCalcSaves = vi.fn();
const mockTrialLogUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => mockWeddings()),
          })),
        };
      }
      if (table === "calculator_saves") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => mockCalcSaves()),
          })),
        };
      }
      if (table === "trial_email_log") {
        return {
          upsert: vi.fn(() => mockTrialLogUpsert()),
        };
      }
      return {} as Record<string, unknown>;
    }),
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { getUser: vi.fn() },
    }),
}));

vi.mock("@/lib/email-sequences", () => ({
  runSequenceForRecipient: vi.fn().mockResolvedValue({
    sent: 0,
    sentSteps: [],
    skippedAudience: 0,
    skippedAlreadySent: 0,
    skippedUnsubscribed: 0,
    errors: [],
  }),
}));

vi.mock("@/lib/analytics-server", () => ({
  captureServer: vi.fn().mockResolvedValue(undefined),
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

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  mockWeddings.mockResolvedValue({ data: [] });
  mockCalcSaves.mockResolvedValue({ data: [] });
});

describe("POST /api/cron/trial-emails", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns 200 with zero counts when there are no candidates in window", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, sent: 0, skipped: 0 });
  });

  it("queries both weddings and calculator_saves within their windows", async () => {
    await POST(cronReq("Bearer test-cron-secret"));
    expect(mockWeddings).toHaveBeenCalled();
    expect(mockCalcSaves).toHaveBeenCalled();
  });
});
