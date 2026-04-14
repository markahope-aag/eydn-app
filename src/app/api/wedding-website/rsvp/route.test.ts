import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockListResult = vi.fn();
const mockGuests = vi.fn();
const mockExistingTokens = vi.fn();
const mockInsert = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === "rsvp_tokens") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              const chain: Record<string, unknown> = {};
              chain.order = vi.fn(() => mockListResult());
              chain.then = (resolve: (v: unknown) => void) =>
                resolve(mockExistingTokens());
              return chain;
            }),
          })),
          insert: (...args: unknown[]) => mockInsert(...args),
        };
      }
      // guests
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => mockGuests()),
        })),
      };
    }),
  };
}

import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
  });
  mockListResult.mockResolvedValue({ data: [], error: null });
  mockGuests.mockResolvedValue({ data: [], error: null });
  mockExistingTokens.mockResolvedValue({ data: [] });
  mockInsert.mockResolvedValue({ error: null });
});

describe("GET /api/wedding-website/rsvp", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the token list", async () => {
    mockListResult.mockResolvedValue({
      data: [{ id: "tok1", token: "abc" }],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

describe("POST /api/wedding-website/rsvp", () => {
  it("returns 500 when the guest query fails", async () => {
    mockGuests.mockResolvedValue({ data: null, error: { message: "db" } });
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it("returns created:0 when every guest already has a token", async () => {
    mockGuests.mockResolvedValue({
      data: [{ id: "g1" }, { id: "g2" }],
      error: null,
    });
    mockExistingTokens.mockResolvedValue({
      data: [{ guest_id: "g1" }, { guest_id: "g2" }],
    });
    const res = await POST();
    const body = await res.json();
    expect(body.created).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates tokens only for guests without one", async () => {
    mockGuests.mockResolvedValue({
      data: [{ id: "g1" }, { id: "g2" }, { id: "g3" }],
      error: null,
    });
    mockExistingTokens.mockResolvedValue({ data: [{ guest_id: "g1" }] });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(2);
    expect(mockInsert).toHaveBeenCalled();
    const inserted = mockInsert.mock.calls[0][0] as Array<{ guest_id: string }>;
    expect(inserted.map((r) => r.guest_id)).toEqual(["g2", "g3"]);
  });
});
