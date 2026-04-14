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
          eq: vi.fn(() => ({
            single: mockSelectSingle,
          })),
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

import { GET, PATCH } from "./route";

type Ctx = { params: Promise<{ slug: string }> };
function ctx(slug: string): Ctx {
  return { params: Promise.resolve({ slug }) };
}

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/guides/budget", {
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
  mockSelectSingle.mockResolvedValue({ data: null });
  mockUpsertSingle.mockResolvedValue({
    data: { id: "gr_1", guide_slug: "budget" },
    error: null,
  });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/guides/[slug]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost"), ctx("budget"));
    expect(res.status).toBe(401);
  });

  it("returns null when no response row exists yet", async () => {
    const res = await GET(new Request("http://localhost"), ctx("budget"));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns the existing response row", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id: "gr_1", guide_slug: "budget", responses: { q1: "yes" } },
    });
    const res = await GET(new Request("http://localhost"), ctx("budget"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "gr_1" });
  });
});

// ─── PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/guides/[slug]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(patchReq({ responses: {} }), ctx("budget"));
    expect(res.status).toBe(401);
  });

  it("upserts the responses and returns the row", async () => {
    const res = await PATCH(
      patchReq({ responses: { q1: "yes" }, section_index: 2, completed: false }),
      ctx("budget")
    );
    expect(res.status).toBe(200);
    expect(mockUpsertSingle).toHaveBeenCalled();
  });

  it("surfaces supabase errors from the upsert", async () => {
    mockUpsertSingle.mockResolvedValue({ data: null, error: { message: "db", code: "500" } });
    const res = await PATCH(patchReq({ responses: {} }), ctx("budget"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
