import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockOrderResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: mockOrderResult,
        })),
      })),
    })),
  };
}

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockOrderResult.mockResolvedValue({ data: [], error: null });
});

describe("GET /api/guides", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the list of guide responses", async () => {
    mockOrderResult.mockResolvedValue({
      data: [{ guide_slug: "budget", completed: true }],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("surfaces supabase errors", async () => {
    mockOrderResult.mockResolvedValue({ data: null, error: { message: "db", code: "500" } });
    const res = await GET();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
