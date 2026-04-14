import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockVendors = vi.fn();
const mockExisting = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            is: vi.fn(() => ({
              gt: vi.fn(() => mockVendors()),
            })),
          })),
        };
      }
      // notifications
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => mockExisting()),
            })),
          })),
        })),
        insert: (...args: unknown[]) => mockInsert(...args),
      };
    }),
  }),
}));

const mockLogCron = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cron-logger", () => ({
  logCronExecution: (...args: unknown[]) => mockLogCron(...args),
}));

import { GET } from "./route";

const ORIGINAL_ENV = process.env;

function cronReq(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("http://localhost/api/cron/vendor-reminders", { method: "GET", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.CRON_SECRET = "test-cron-secret";
  mockVendors.mockResolvedValue({ data: [] });
  mockExisting.mockResolvedValue({ data: [] });
  mockInsert.mockResolvedValue({ error: null });
});

describe("GET /api/cron/vendor-reminders", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await GET(cronReq(null));
    expect(res.status).toBe(401);
  });

  it("returns 0 notifications when no vendors owe money", async () => {
    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notifications_created: 0 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("skips vendors with no outstanding balance and non-upcoming status", async () => {
    mockVendors.mockResolvedValue({
      data: [
        {
          id: "v1",
          wedding_id: "wed_1",
          name: "Florist",
          category: "florist",
          amount: 1000,
          amount_paid: 1000,
          status: "paid",
        },
      ],
    });
    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect((await res.json()).notifications_created).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates a notification for vendors with an outstanding balance", async () => {
    mockVendors.mockResolvedValue({
      data: [
        {
          id: "v1",
          wedding_id: "wed_1",
          name: "Florist",
          amount: 1000,
          amount_paid: 500,
          status: "deposit_paid",
        },
      ],
    });
    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect((await res.json()).notifications_created).toBe(1);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("skips vendors already notified in the last 7 days", async () => {
    mockVendors.mockResolvedValue({
      data: [
        {
          id: "v1",
          wedding_id: "wed_1",
          name: "Florist",
          amount: 1000,
          amount_paid: 500,
          status: "booked",
        },
      ],
    });
    mockExisting.mockResolvedValue({ data: [{ vendor_id: "v1" }] });
    const res = await GET(cronReq("Bearer test-cron-secret"));
    expect((await res.json()).notifications_created).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
