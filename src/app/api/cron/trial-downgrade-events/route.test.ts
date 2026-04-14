import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockWeddingsResult = vi.fn();
const mockPurchaseResult = vi.fn();

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
      // subscriber_purchases
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
    }),
  }),
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
  return new Request("http://localhost/api/cron/trial-downgrade-events", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  delete process.env.BACKUP_SECRET;
  mockWeddingsResult.mockResolvedValue({ data: [], error: null });
  mockPurchaseResult.mockResolvedValue({ data: null, error: null });
});

describe("POST /api/cron/trial-downgrade-events", () => {
  it("returns 401 when authorization header is missing", async () => {
    const res = await POST(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the bearer token does not match", async () => {
    const res = await POST(cronReq("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("accepts CRON_SECRET", async () => {
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
  });

  it("accepts BACKUP_SECRET as a fallback", async () => {
    process.env.BACKUP_SECRET = "backup-secret";
    const res = await POST(cronReq("Bearer backup-secret"));
    expect(res.status).toBe(200);
  });

  it("returns 500 when the weddings query errors", async () => {
    mockWeddingsResult.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });

  it("emits a downgrade event for each expired trial without an active purchase", async () => {
    mockWeddingsResult.mockResolvedValueOnce({
      data: [
        { id: "w1", user_id: "u1", trial_started_at: "2026-03-29T00:00:00Z", created_at: "2026-03-29T00:00:00Z" },
        { id: "w2", user_id: "u2", trial_started_at: null, created_at: "2026-03-29T00:00:00Z" },
      ],
      error: null,
    });
    mockPurchaseResult.mockResolvedValue({ data: null, error: null });

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emitted).toBe(2);

    expect(mockCapture).toHaveBeenCalledTimes(2);
    expect(mockCapture).toHaveBeenCalledWith(
      "u1",
      "trial_expired_auto_downgrade",
      expect.objectContaining({ wedding_id: "w1" })
    );
    // user_id_2 falls back to created_at when trial_started_at is null
    expect(mockCapture).toHaveBeenCalledWith(
      "u2",
      "trial_expired_auto_downgrade",
      expect.objectContaining({ trial_started_at: "2026-03-29T00:00:00Z" })
    );
  });

  it("skips users who already have an active purchase", async () => {
    mockWeddingsResult.mockResolvedValueOnce({
      data: [
        { id: "w1", user_id: "u1", trial_started_at: null, created_at: "2026-03-29T00:00:00Z" },
      ],
      error: null,
    });
    mockPurchaseResult.mockResolvedValueOnce({
      data: { id: "purchase_1" },
      error: null,
    });

    const res = await POST(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect((await res.json()).emitted).toBe(0);
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
