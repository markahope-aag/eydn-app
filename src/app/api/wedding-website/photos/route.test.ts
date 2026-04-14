import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockListResult = vi.fn();
const mockDeleteResult = vi.fn();
const mockUpdateResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => mockListResult()),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => mockDeleteResult()),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => mockUpdateResult()),
        })),
      })),
    })),
  };
}

import { GET, DELETE, PATCH } from "./route";

function deleteReq(id: string | null): NextRequest {
  const url = id
    ? `http://localhost/api/wedding-website/photos?id=${id}`
    : "http://localhost/api/wedding-website/photos";
  return new NextRequest(url, { method: "DELETE" });
}

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/wedding-website/photos", {
    method: "PATCH",
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
  mockListResult.mockResolvedValue({ data: [], error: null });
  mockDeleteResult.mockResolvedValue({ error: null });
  mockUpdateResult.mockResolvedValue({ error: null });
});

describe("GET /api/wedding-website/photos", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the photo list", async () => {
    mockListResult.mockResolvedValue({
      data: [{ id: "p1" }],
      error: null,
    });
    const res = await GET();
    expect(await res.json()).toHaveLength(1);
  });
});

describe("DELETE /api/wedding-website/photos", () => {
  it("returns 400 when id is missing", async () => {
    const res = await DELETE(deleteReq(null));
    expect(res.status).toBe(400);
  });

  it("deletes the row on success", async () => {
    const res = await DELETE(deleteReq("p1"));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/wedding-website/photos", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await PATCH(patchReq({ id: "p1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when approved is not boolean", async () => {
    const res = await PATCH(patchReq({ id: "p1", approved: "yes" }));
    expect(res.status).toBe(400);
  });

  it("approves a photo on success", async () => {
    const res = await PATCH(patchReq({ id: "p1", approved: true }));
    expect(res.status).toBe(200);
    expect(mockUpdateResult).toHaveBeenCalled();
  });

  it("returns 500 when the update errors", async () => {
    mockUpdateResult.mockResolvedValue({ error: { message: "db" } });
    const res = await PATCH(patchReq({ id: "p1", approved: true }));
    expect(res.status).toBe(500);
  });
});
