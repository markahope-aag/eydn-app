import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockTokenLookup = vi.fn();
const mockWeddingLookup = vi.fn();
const mockTasksResult = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "calendar_feed_tokens") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: mockTokenLookup,
              })),
            })),
          })),
        };
      }
      if (table === "weddings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockWeddingLookup,
            })),
          })),
        };
      }
      // tasks
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              not: vi.fn(() => ({
                order: vi.fn(() => mockTasksResult()),
              })),
            })),
          })),
        })),
      };
    }),
  }),
}));

vi.mock("@/lib/ics", () => ({
  generateICSFeed: vi.fn(
    (tasks: unknown[], name: string) =>
      `BEGIN:VCALENDAR\nX-WR-CALNAME:${name}\nTASKS:${tasks.length}\nEND:VCALENDAR`
  ),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false });
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

import { GET } from "./route";

type Ctx = { params: Promise<{ token: string }> };
function ctx(token: string): Ctx {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockTokenLookup.mockResolvedValue({ data: { wedding_id: "wed_1" } });
  mockWeddingLookup.mockResolvedValue({
    data: { partner1_name: "Alice", partner2_name: "Bob" },
  });
  mockTasksResult.mockResolvedValue({ data: [] });
});

describe("GET /api/public/calendar/[token]", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, retryAfter: 60 });
    const res = await GET(new Request("http://localhost"), ctx("tok") as never);
    expect(res.status).toBe(429);
  });

  it("returns 404 when the token is not valid", async () => {
    mockTokenLookup.mockResolvedValue({ data: null });
    const res = await GET(new Request("http://localhost"), ctx("bad") as never);
    expect(res.status).toBe(404);
  });

  it("serves an ICS feed with the couple's name in the calendar title", async () => {
    mockTasksResult.mockResolvedValue({
      data: [
        { id: "t1", title: "Book Venue", due_date: "2026-05-01" },
        { id: "t2", title: "Order Cake", due_date: "2026-06-01" },
      ],
    });
    const res = await GET(new Request("http://localhost"), ctx("tok") as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    expect(res.headers.get("Content-Disposition")).toContain("eydn-tasks.ics");
    const text = await res.text();
    expect(text).toContain("Alice & Bob");
    expect(text).toContain("TASKS:2");
  });

  it("falls back to a generic title when the wedding lookup fails", async () => {
    mockWeddingLookup.mockResolvedValue({ data: null });
    const res = await GET(new Request("http://localhost"), ctx("tok") as never);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Wedding Tasks");
  });
});
