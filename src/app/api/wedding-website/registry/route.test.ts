import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockListResult = vi.fn();
const mockCountResult = vi.fn();
const mockInsertSingle = vi.fn();
const mockDeleteResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn((_cols: string, opts?: { count?: string }) => {
        if (opts?.count === "exact") {
          return { eq: vi.fn(() => mockCountResult()) };
        }
        return {
          eq: vi.fn(() => ({
            order: vi.fn(() => mockListResult()),
          })),
        };
      }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => mockDeleteResult()),
        })),
      })),
    })),
  };
}

import { GET, POST, DELETE } from "./route";

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/wedding-website/registry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteReq(id: string | null): NextRequest {
  const url = id
    ? `http://localhost/api/wedding-website/registry?id=${id}`
    : "http://localhost/api/wedding-website/registry";
  return new NextRequest(url, { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockListResult.mockResolvedValue({ data: [], error: null });
  mockCountResult.mockResolvedValue({ count: 2 });
  mockInsertSingle.mockResolvedValue({
    data: { id: "r1", name: "Zola", sort_order: 3 },
    error: null,
  });
  mockDeleteResult.mockResolvedValue({ error: null });
});

describe("GET /api/wedding-website/registry", () => {
  it("returns the registry list", async () => {
    mockListResult.mockResolvedValue({
      data: [{ id: "r1", name: "Zola" }],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

describe("POST /api/wedding-website/registry", () => {
  it("inserts a new row with next sort_order", async () => {
    const res = await POST(postReq({ name: "Zola", url: "https://zola.com" }));
    expect(res.status).toBe(201);
    expect(mockInsertSingle).toHaveBeenCalled();
  });
});

describe("DELETE /api/wedding-website/registry", () => {
  it("returns 400 when id is missing", async () => {
    const res = await DELETE(deleteReq(null));
    expect(res.status).toBe(400);
  });

  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(deleteReq("r1"));
    expect(res.status).toBe(401);
  });

  it("deletes the row on success", async () => {
    const res = await DELETE(deleteReq("r1"));
    expect(res.status).toBe(200);
    expect(mockDeleteResult).toHaveBeenCalled();
  });
});
