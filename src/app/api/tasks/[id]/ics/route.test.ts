import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockTaskLookup = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              single: mockTaskLookup,
            })),
          })),
        })),
      })),
    })),
  };
}

vi.mock("@/lib/ics", () => ({
  generateSingleEventICS: vi.fn(() => "BEGIN:VCALENDAR\nEND:VCALENDAR"),
}));

import { GET } from "./route";

type Ctx = { params: Promise<{ id: string }> };
function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockTaskLookup.mockResolvedValue({
    data: {
      id: "t1",
      title: "Book Venue",
      description: "",
      due_date: "2026-05-01",
      status: "pending",
      priority: "high",
      category: "venue",
    },
  });
});

describe("GET /api/tasks/[id]/ics", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the task does not belong to the wedding", async () => {
    mockTaskLookup.mockResolvedValue({ data: null });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(404);
  });

  it("returns 400 when the task has no due date", async () => {
    mockTaskLookup.mockResolvedValue({
      data: { id: "t1", title: "No date", due_date: null },
    });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(400);
  });

  it("returns an ICS attachment with a slug filename", async () => {
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    expect(res.headers.get("Content-Disposition")).toContain("book-venue.ics");
    expect(await res.text()).toContain("BEGIN:VCALENDAR");
  });
});
