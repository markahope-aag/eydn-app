import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockPublicSingle = vi.fn();
const mockUpdateSingle = vi.fn();
const mockDeleteResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockPublicSingle,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdateSingle,
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => mockDeleteResult()),
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

import { GET, PATCH, DELETE } from "./route";

type Ctx = { params: Promise<{ slug: string }> };
function ctx(slug: string): Ctx {
  return { params: Promise.resolve({ slug }) };
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/blog/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPublicSingle.mockResolvedValue({
    data: { slug: "hello", title: "Hello" },
    error: null,
  });
  mockRequireAdmin.mockResolvedValue({
    supabase: makeSupabase(),
    userId: "admin_1",
  });
  mockUpdateSingle.mockResolvedValue({
    data: { slug: "hello", status: "draft" },
    error: null,
  });
  mockDeleteResult.mockResolvedValue({ error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/blog/[slug]", () => {
  it("returns the published post", async () => {
    const res = (await GET(new NextRequest("http://localhost"), ctx("hello") as never))!;
    expect(res.status).toBe(200);
  });

  it("returns 404 when no published post matches", async () => {
    mockPublicSingle.mockResolvedValue({ data: null, error: null });
    const res = (await GET(new NextRequest("http://localhost"), ctx("ghost") as never))!;
    expect(res.status).toBe(404);
  });
});

// ─── PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/blog/[slug]", () => {
  it("returns 403 when caller is not an admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = (await PATCH(patchReq({ title: "New" }), ctx("hello") as never))!;
    expect(res.status).toBe(403);
  });

  it("updates allowed fields and returns the post", async () => {
    const res = (await PATCH(patchReq({ title: "New" }), ctx("hello") as never))!;
    expect(res.status).toBe(200);
  });

  it("calls IndexNow when the resulting post is published", async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { slug: "hello", status: "published" },
      error: null,
    });
    await PATCH(patchReq({ status: "published", content: "hi world there" }), ctx("hello") as never);
    expect(mockIndexNow).toHaveBeenCalledWith(["/blog/hello", "/blog"]);
  });

  it("returns 500 when the update fails", async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = (await PATCH(patchReq({ title: "x" }), ctx("hello") as never))!;
    expect(res.status).toBe(500);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────

describe("DELETE /api/blog/[slug]", () => {
  it("returns 403 when caller is not an admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = (await DELETE(new NextRequest("http://localhost"), ctx("hello") as never))!;
    expect(res.status).toBe(403);
  });

  it("deletes the post on success", async () => {
    const res = (await DELETE(new NextRequest("http://localhost"), ctx("hello") as never))!;
    expect(res.status).toBe(200);
    expect(mockDeleteResult).toHaveBeenCalled();
  });

  it("returns 500 when the delete fails", async () => {
    mockDeleteResult.mockResolvedValue({ error: { message: "db down" } });
    const res = (await DELETE(new NextRequest("http://localhost"), ctx("hello") as never))!;
    expect(res.status).toBe(500);
  });
});
