import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockUpdateResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => mockUpdateResult()),
      })),
    })),
  };
}

import { GET, PUT } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1", tour_complete: false },
    supabase: makeSupabase(),
  });
  mockUpdateResult.mockResolvedValue({ error: null });
});

describe("GET /api/tour-status", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns tour_complete:false by default", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ tour_complete: false });
  });

  it("returns tour_complete:true when set", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      wedding: { id: "wed_1", tour_complete: true },
      supabase: makeSupabase(),
    });
    const res = await GET();
    expect(await res.json()).toEqual({ tour_complete: true });
  });
});

describe("PUT /api/tour-status", () => {
  it("marks the wedding tour as complete", async () => {
    const res = await PUT();
    expect(res.status).toBe(200);
    expect(mockUpdateResult).toHaveBeenCalled();
  });

  it("surfaces supabase errors", async () => {
    mockUpdateResult.mockResolvedValue({ error: { message: "db down", code: "500" } });
    const res = await PUT();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
