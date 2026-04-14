import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockListResult = vi.fn();
const mockGuestLookup = vi.fn();
const mockTableLookup = vi.fn();
const mockUpsertSingle = vi.fn();
const mockDeleteResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === "seat_assignments") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => mockListResult()),
            })),
          })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockUpsertSingle,
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => mockDeleteResult()),
          })),
        };
      }
      if (table === "guests") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => {
                const chain: Record<string, unknown> = {};
                chain.is = vi.fn(() => ({ single: mockGuestLookup }));
                chain.single = mockGuestLookup;
                return chain;
              }),
            })),
          })),
        };
      }
      // seating_tables
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: mockTableLookup,
              })),
            })),
          })),
        })),
      };
    }),
  };
}

import { GET, POST, DELETE } from "./route";

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/seating/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteReq(guestId: string | null): Request {
  const qs = guestId ? `?guest_id=${guestId}` : "";
  return new Request(`http://localhost/api/seating/assignments${qs}`, { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockListResult.mockResolvedValue({ data: [], error: null });
  mockGuestLookup.mockResolvedValue({ data: { id: "g1" } });
  mockTableLookup.mockResolvedValue({ data: { id: "tbl_1" } });
  mockUpsertSingle.mockResolvedValue({
    data: { id: "sa_1", guest_id: "g1", seating_table_id: "tbl_1" },
    error: null,
  });
  mockDeleteResult.mockResolvedValue({ error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/seating/assignments", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the assignment list", async () => {
    mockListResult.mockResolvedValue({ data: [{ id: "sa_1" }], error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/seating/assignments", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await POST(postReq({ guest_id: "g1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when guest does not belong to the wedding", async () => {
    mockGuestLookup.mockResolvedValue({ data: null });
    const res = await POST(postReq({ guest_id: "g1", seating_table_id: "tbl_1" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Guest/);
  });

  it("returns 404 when table does not belong to the wedding", async () => {
    mockTableLookup.mockResolvedValue({ data: null });
    const res = await POST(postReq({ guest_id: "g1", seating_table_id: "tbl_1" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Table/);
  });

  it("upserts the assignment on success", async () => {
    const res = await POST(
      postReq({ guest_id: "g1", seating_table_id: "tbl_1", seat_number: 3 })
    );
    expect(res.status).toBe(201);
    expect(mockUpsertSingle).toHaveBeenCalled();
  });
});

// ─── DELETE ───────────────────────────────────────────────────────

describe("DELETE /api/seating/assignments", () => {
  it("returns 400 when guest_id is missing", async () => {
    const res = await DELETE(deleteReq(null));
    expect(res.status).toBe(400);
  });

  it("returns 404 when guest does not belong to the wedding", async () => {
    mockGuestLookup.mockResolvedValue({ data: null });
    const res = await DELETE(deleteReq("g1"));
    expect(res.status).toBe(404);
  });

  it("deletes the assignment on success", async () => {
    const res = await DELETE(deleteReq("g1"));
    expect(res.status).toBe(200);
    expect(mockDeleteResult).toHaveBeenCalled();
  });
});
