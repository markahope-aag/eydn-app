import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockListResult = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => mockListResult()),
      })),
      insert: (...args: unknown[]) => mockInsert(...args),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => mockDelete()),
        })),
      })),
    })),
  };
}

import { GET, POST, DELETE } from "./route";

type Ctx = { params: Promise<{ id: string }> };
function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/tasks/t1/related", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteReq(relatedId: string | null): Request {
  const qs = relatedId ? `?related_task_id=${relatedId}` : "";
  return new Request(`http://localhost/api/tasks/t1/related${qs}`, { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockListResult.mockResolvedValue({ data: [], error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockDelete.mockResolvedValue({ error: null });
});

describe("GET /api/tasks/[id]/related", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(401);
  });

  it("returns the related-task list", async () => {
    mockListResult.mockResolvedValue({
      data: [{ related_task_id: "t2" }],
      error: null,
    });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

describe("POST /api/tasks/[id]/related", () => {
  it("creates a bidirectional link", async () => {
    const res = await POST(postReq({ related_task_id: "t2" }), ctx("t1") as never);
    expect(res.status).toBe(201);
    const rows = mockInsert.mock.calls[0][0] as Array<{ task_id: string; related_task_id: string }>;
    expect(rows).toEqual([
      { task_id: "t1", related_task_id: "t2" },
      { task_id: "t2", related_task_id: "t1" },
    ]);
  });

  it("surfaces supabase errors", async () => {
    mockInsert.mockResolvedValue({ error: { message: "db", code: "500" } });
    const res = await POST(postReq({ related_task_id: "t2" }), ctx("t1") as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("DELETE /api/tasks/[id]/related", () => {
  it("returns 400 when related_task_id is missing", async () => {
    const res = await DELETE(deleteReq(null), ctx("t1") as never);
    expect(res.status).toBe(400);
  });

  it("removes both link directions", async () => {
    const res = await DELETE(deleteReq("t2"), ctx("t1") as never);
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });
});
