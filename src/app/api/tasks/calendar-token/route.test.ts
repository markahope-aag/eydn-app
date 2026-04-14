import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockSelectSingle = vi.fn();
const mockInsertSingle = vi.fn();
const mockUpdateResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            single: mockSelectSingle,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => mockUpdateResult()),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle,
        })),
      })),
    })),
  };
}

import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockSelectSingle.mockResolvedValue({ data: null });
  mockInsertSingle.mockResolvedValue({ data: { token: "abc123" }, error: null });
  mockUpdateResult.mockResolvedValue({ error: null });
});

describe("GET /api/tasks/calendar-token", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns null when no active token exists", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ token: null });
  });

  it("returns the existing active token", async () => {
    mockSelectSingle.mockResolvedValue({ data: { token: "abc123" } });
    const res = await GET();
    expect(await res.json()).toEqual({ token: "abc123" });
  });
});

describe("POST /api/tasks/calendar-token", () => {
  it("revokes any previous token and creates a new one", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "abc123" });
    expect(mockUpdateResult).toHaveBeenCalled();
    expect(mockInsertSingle).toHaveBeenCalled();
  });

  it("returns 500 when the insert fails", async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
