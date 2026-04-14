import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

// Every supabase query resolves to `{ data: null }` by default so the
// route runs without crashing. We override specific call sequences per-test.
const defaultResult = { data: null, error: null };
const resultQueue: Array<{ data: unknown; error?: unknown }> = [];

function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  const noop = vi.fn(() => c);
  c.select = noop;
  c.eq = noop;
  c.is = noop;
  c.gte = noop;
  c.lte = noop;
  c.lt = noop;
  c.in = noop;
  c.single = vi.fn(() => Promise.resolve(resultQueue.shift() || defaultResult));
  c.then = (resolve: (v: unknown) => void) =>
    resolve(resultQueue.shift() || defaultResult);
  return c;
}

const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      ...chain(),
      insert: (...args: unknown[]) => mockInsert(...args),
    })),
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

vi.mock("@/lib/email-preferences", () => ({
  getEmailPreferences: vi.fn().mockResolvedValue({
    unsubscribed_all: false,
    deadline_reminders: true,
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "user@example.com" }],
        }),
      },
    }),
}));

import { GET } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/check-deadlines", { method: "GET", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  resultQueue.length = 0;
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("GET /api/cron/check-deadlines", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await GET(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns 0 notifications when there are no due or overdue tasks", async () => {
    // Queue: upcoming tasks (null) → overdue tasks (null)
    resultQueue.push({ data: [] }, { data: [] });
    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications_created).toBe(0);
    expect(body.emails_sent).toBe(0);
  });

  it("logs success to the cron logger", async () => {
    resultQueue.push({ data: [] }, { data: [] });
    await GET(cronReq("Bearer test-cron-secret"));
    expect(mockLogCron).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: "check-deadlines", status: "success" })
    );
  });
});
