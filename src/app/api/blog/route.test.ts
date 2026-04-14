import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockOrderResult = vi.fn();
const mockInsertSingle = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.eq = vi.fn(() => chain);
        chain.order = vi.fn(() => chain);
        chain.then = (resolve: (v: unknown) => void) => resolve(mockOrderResult());
        return chain;
      }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle,
        })),
      })),
    })),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => makeSupabase(),
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockIndexNow = vi.fn();
vi.mock("@/lib/indexnow", () => ({
  submitToIndexNow: (...args: unknown[]) => mockIndexNow(...args),
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";

function getReq(query: string = ""): NextRequest {
  return new NextRequest(`http://localhost/api/blog${query}`);
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/blog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderResult.mockResolvedValue({ data: [], error: null });
  mockRequireAdmin.mockResolvedValue({
    supabase: makeSupabase(),
    userId: "admin_1",
  });
  mockInsertSingle.mockResolvedValue({ data: { id: "post_1" }, error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/blog", () => {
  it("returns public published posts without calling requireAdmin", async () => {
    mockOrderResult.mockResolvedValue({
      data: [{ id: "p1", slug: "hello", status: "published" }],
      error: null,
    });
    const res = (await GET(getReq()))!;
    expect(res.status).toBe(200);
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });

  it("filters by category query param", async () => {
    const res = (await GET(getReq("?category=planning")))!;
    expect(res.status).toBe(200);
  });

  it("returns admin list when ?admin=true and caller is an admin", async () => {
    const res = (await GET(getReq("?admin=true")))!;
    expect(res.status).toBe(200);
    expect(mockRequireAdmin).toHaveBeenCalled();
  });

  it("forwards admin auth errors", async () => {
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = (await GET(getReq("?admin=true")))!;
    expect(res.status).toBe(403);
  });

  it("returns 500 when the public query errors", async () => {
    mockOrderResult.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = (await GET(getReq()))!;
    expect(res.status).toBe(500);
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/blog", () => {
  it("returns 403 when not an admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = (await POST(postReq({ title: "t", slug: "t" })))!;
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    const res = (await POST(postReq({ slug: "t" })))!;
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing", async () => {
    const res = (await POST(postReq({ title: "Hello" })))!;
    expect(res.status).toBe(400);
  });

  it("inserts a draft post and returns 201", async () => {
    const res = (await POST(postReq({ title: "Hello", slug: "hello", status: "draft" })))!;
    expect(res.status).toBe(201);
    expect(mockIndexNow).not.toHaveBeenCalled();
  });

  it("calls IndexNow when the post is published immediately", async () => {
    const res = (await POST(postReq({ title: "Hello", slug: "hello", status: "published" })))!;
    expect(res.status).toBe(201);
    expect(mockIndexNow).toHaveBeenCalledWith(["/blog/hello", "/blog"]);
  });
});
