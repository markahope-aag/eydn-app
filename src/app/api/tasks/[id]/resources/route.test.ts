import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockListResult = vi.fn();
const mockInsertSingle = vi.fn();
const mockDeleteResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => mockListResult()),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => mockDeleteResult()),
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
  return new Request("http://localhost/api/tasks/t1/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteReq(resourceId: string | null): Request {
  const qs = resourceId ? `?resource_id=${resourceId}` : "";
  return new Request(`http://localhost/api/tasks/t1/resources${qs}`, { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockListResult.mockResolvedValue({ data: [], error: null });
  mockInsertSingle.mockResolvedValue({
    data: { id: "r1", label: "Guide", url: "https://example.com" },
    error: null,
  });
  mockDeleteResult.mockResolvedValue({ error: null });
});

describe("GET /api/tasks/[id]/resources", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(401);
  });

  it("returns the task resource list", async () => {
    mockListResult.mockResolvedValue({
      data: [{ id: "r1", label: "Guide" }],
      error: null,
    });
    const res = await GET(new Request("http://localhost"), ctx("t1") as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

describe("POST /api/tasks/[id]/resources", () => {
  it("creates a resource row", async () => {
    const res = await POST(
      postReq({ label: "Guide", url: "https://example.com" }),
      ctx("t1") as never
    );
    expect(res.status).toBe(201);
    expect(mockInsertSingle).toHaveBeenCalled();
  });

  it("surfaces supabase errors", async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: "db", code: "500" } });
    const res = await POST(postReq({ label: "x", url: "https://e.com" }), ctx("t1") as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("DELETE /api/tasks/[id]/resources", () => {
  it("returns 400 when resource_id is missing", async () => {
    const res = await DELETE(deleteReq(null), ctx("t1") as never);
    expect(res.status).toBe(400);
  });

  it("deletes the resource row on success", async () => {
    const res = await DELETE(deleteReq("r1"), ctx("t1") as never);
    expect(res.status).toBe(200);
    expect(mockDeleteResult).toHaveBeenCalled();
  });
});
