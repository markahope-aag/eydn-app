import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockSelectSingle = vi.fn();
const mockUpsertSingle = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSelectSingle,
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockUpsertSingle,
        })),
      })),
    })),
  };
}

import { GET, PUT } from "./route";

function putReq(body: unknown): Request {
  return new Request("http://localhost/api/rehearsal-dinner", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockSelectSingle.mockResolvedValue({ data: { id: "rd_1", wedding_id: "wed_1" } });
  mockUpsertSingle.mockResolvedValue({ data: { id: "rd_1" }, error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/rehearsal-dinner", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the existing row when one exists", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockUpsertSingle).not.toHaveBeenCalled();
  });

  it("auto-creates an empty row when none exists", async () => {
    mockSelectSingle.mockResolvedValue({ data: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockUpsertSingle).toHaveBeenCalled();
  });
});

// ─── PUT ──────────────────────────────────────────────────────────

describe("PUT /api/rehearsal-dinner", () => {
  it("returns 400 when timeline is not an array", async () => {
    const res = await PUT(putReq({ timeline: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when guest_list is not an array", async () => {
    const res = await PUT(putReq({ guest_list: "nope" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a timeline entry is not an object", async () => {
    const res = await PUT(putReq({ timeline: ["string-entry"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a guest_list entry is not an object", async () => {
    const res = await PUT(putReq({ guest_list: [42] }));
    expect(res.status).toBe(400);
  });

  it("upserts valid data and returns the row", async () => {
    const res = await PUT(
      putReq({
        venue: "Garden Hall",
        date: "2026-07-31",
        timeline: [{ time: "6 PM", item: "Toast" }],
        guest_list: [{ name: "Alice" }],
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsertSingle).toHaveBeenCalled();
  });
});
