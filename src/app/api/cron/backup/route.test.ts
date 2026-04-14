import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockWeddings = vi.fn();

function chain(result: unknown): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  const noop = vi.fn(() => c);
  c.select = noop;
  c.eq = noop;
  c.order = noop;
  c.limit = noop;
  c.single = vi.fn(() => Promise.resolve({ data: null }));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "weddings") {
        return chain(mockWeddings());
      }
      // All per-wedding queries return empty data.
      return chain({ data: [] });
    }),
  }),
}));

const mockLogCron = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cron-logger", () => ({
  logCronExecution: (...args: unknown[]) => mockLogCron(...args),
}));

import { POST } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/backup", { method: "POST", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  delete process.env.BACKUP_SFTP_HOST;
  delete process.env.BACKUP_SFTP_USER;
  mockWeddings.mockReturnValue({ data: [], error: null });
});

describe("POST /api/cron/backup", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns success with sftp:false when SFTP is unconfigured", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sftp).toBe(false);
    expect(body.weddings).toBe(0);
    spy.mockRestore();
  });

  it("returns 500 when the initial weddings query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockWeddings.mockReturnValue({ data: null, error: { message: "db down" } });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });
});
