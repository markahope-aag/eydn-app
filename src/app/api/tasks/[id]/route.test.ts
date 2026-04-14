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
  return new Request("http://localhost/api/tasks/t1", {
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
    data: { id: "t1", title: "Book Venue" },
    error: null,
  });
  mockSoftDelete.mockResolvedValue({ error: null });
});

// ─── PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/tasks/[id]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(patchReq({ name: "x" }), ctx("t1") as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no allowed fields are provided", async () => {
    const res = await PATCH(patchReq({ notARealField: 1 }), ctx("t1") as never);
    expect(res.status).toBe(400);
  });

  it("updates allowed fields and returns the updated row", async () => {
    const res = await PATCH(
      patchReq({ title: "Book Venue", completed: true, priority: "high" }),
      ctx("t1") as never
    );
    expect(res.status).toBe(200);
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("silently drops unknown fields while accepting valid ones", async () => {
    const res = await PATCH(
      patchReq({ title: "Book Venue", hackerField: "pwned" }),
      ctx("t1") as never
    );
    expect(res.status).toBe(200);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────

describe("DELETE /api/tasks/[id]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(401);
  });

  it("soft-deletes the row and logs activity", async () => {
    const res = await DELETE(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(200);
    expect(mockSoftDelete).toHaveBeenCalledWith(
      expect.anything(),
      "tasks",
      "t1",
      "wed_1"
    );
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it("surfaces supabase errors from the soft delete", async () => {
    mockSoftDelete.mockResolvedValue({ error: { message: "db down", code: "500" } });
    const res = await DELETE(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
