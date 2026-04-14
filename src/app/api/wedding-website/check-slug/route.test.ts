import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockMaybeSingle = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      })),
    })),
  };
}

import { GET } from "./route";

function getReq(query: string = ""): Request {
  return new Request(`http://localhost/api/wedding-website/check-slug${query}`, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockMaybeSingle.mockResolvedValue({ data: null });
});

describe("GET /api/wedding-website/check-slug", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(getReq("?slug=alice-bob"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(400);
  });

  it("returns available:true when no other wedding owns the slug", async () => {
    const res = await GET(getReq("?slug=alice-bob"));
    expect(await res.json()).toEqual({ available: true });
  });

  it("returns available:false when another wedding owns the slug", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "wed_2" } });
    const res = await GET(getReq("?slug=alice-bob"));
    expect(await res.json()).toEqual({ available: false });
  });
});
