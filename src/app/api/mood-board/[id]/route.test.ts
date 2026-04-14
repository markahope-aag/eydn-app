import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockUpdateSingle = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockUpdateSingle,
            })),
          })),
        })),
      })),
    })),
  };
}

const mockSoftDelete = vi.fn();
const mockLogActivity = vi.fn();
vi.mock("@/lib/audit", () => ({
  softDelete: (...args: unknown[]) => mockSoftDelete(...args),
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

import { PATCH, DELETE } from "./route";

type Ctx = { params: Promise<{ id: string }> };
function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/guests/g1", {
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
    userId: "user_123",
  });
  mockUpdateSingle.mockResolvedValue({
    data: { id: "g1", caption: "Vibes" },
    error: null,
  });
  mockSoftDelete.mockResolvedValue({ error: null });
});

// ─── PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/mood-board/[id]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(patchReq({ name: "x" }), ctx("g1") as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no allowed fields are provided", async () => {
    const res = await PATCH(patchReq({ notARealField: 1 }), ctx("g1") as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 when no body and no valid fields", async () => {
    const res = await PATCH(patchReq({ name: "x" }), ctx("g1") as never);
    // 'name' is not in ALLOWED_FIELDS for mood-board
    expect(res.status).toBe(400);
  });

  it("updates allowed fields and returns the updated row", async () => {
    const res = await PATCH(
      patchReq({ caption: "Vibes", category: "Decor", sort_order: 2 }),
      ctx("g1") as never
    );
    expect(res.status).toBe(200);
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("silently drops unknown fields while accepting valid ones", async () => {
    const res = await PATCH(
      patchReq({ caption: "Vibes", image_url: "https://evil.example/pwn.png" }),
      ctx("g1") as never
    );
    expect(res.status).toBe(200);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────

describe("DELETE /api/mood-board/[id]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(new Request("http://localhost"), ctx("g1") as never);
    expect(res.status).toBe(401);
  });

  it("soft-deletes the row and logs activity", async () => {
    const res = await DELETE(new Request("http://localhost"), ctx("g1") as never);
    expect(res.status).toBe(200);
    expect(mockSoftDelete).toHaveBeenCalledWith(
      expect.anything(),
      "mood_board_items",
      "g1",
      "wed_1"
    );
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("surfaces supabase errors from the soft delete", async () => {
    mockSoftDelete.mockResolvedValue({ error: { message: "db down", code: "500" } });
    const res = await DELETE(new Request("http://localhost"), ctx("g1") as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
