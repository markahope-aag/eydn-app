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

// R2 client — default to "not configured" so the unconfigured path is the
// default; tests override isR2Configured to exercise a successful upload.
vi.mock("@/lib/backup/r2", () => ({
  isR2Configured: vi.fn(() => false),
  putObject: vi.fn(async (key: string) => key),
  listObjects: vi.fn(async () => []),
  deleteObject: vi.fn(async () => {}),
}));

import { POST } from "./route";
import { isR2Configured } from "@/lib/backup/r2";

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
  vi.mocked(isR2Configured).mockReturnValue(false);
  mockWeddings.mockReturnValue({ data: [], error: null });
});

describe("POST /api/cron/backup", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("logs an error and reports stored:false when R2 is unconfigured", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    // An export that isn't stored off-platform is not a successful backup.
    expect(body.success).toBe(false);
    expect(body.stored).toBe(false);
    expect(body.weddings).toBe(0);
    // Must log as an error so the ops alert + dead-man's switch surface it
    // (the original bug: this path returned before logging at all).
    expect(mockLogCron).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: "backup", status: "error" })
    );
    spy.mockRestore();
  });

  it("uploads to R2 and reports success when configured", async () => {
    vi.mocked(isR2Configured).mockReturnValue(true);
    mockWeddings.mockReturnValue({
      data: [{ id: "w1", partner1_name: "A", partner2_name: "B" }],
      error: null,
    });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stored).toBe(true);
    expect(body.weddings).toBe(1);
    expect(mockLogCron).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: "backup", status: "success" })
    );
  });

  it("returns 500 when the initial weddings query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockWeddings.mockReturnValue({ data: null, error: { message: "db down" } });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });
});
