import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockLimit = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: mockLimit,
          })),
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
  mockLimit.mockResolvedValue({ data: [], error: null });
});

describe("GET /api/activity", () => {
  it("forwards auth-layer errors unchanged", async () => {
    const errorRes = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockGetWeddingForUser.mockResolvedValue({ error: errorRes });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the wedding's activity rows", async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: "a1", created_at: "2026-04-10T00:00:00Z" }],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("returns an error response when the supabase query fails", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "db down", code: "500" } });
    const res = await GET();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
