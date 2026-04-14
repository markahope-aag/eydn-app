import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockDeleteResult = vi.fn();

function makeSupabase() {
  return {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => mockDeleteResult()),
        })),
      })),
    })),
  };
}

import { DELETE } from "./route";

type Ctx = { params: Promise<{ id: string }> };
function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1" },
    supabase: makeSupabase(),
    role: "owner",
  });
  mockDeleteResult.mockResolvedValue({ error: null });
});

describe("DELETE /api/collaborators/[id]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(new Request("http://localhost"), ctx("c1") as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not the wedding owner", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      wedding: { id: "wed_1" },
      supabase: makeSupabase(),
      role: "editor",
    });
    const res = await DELETE(new Request("http://localhost"), ctx("c1") as never);
    expect(res.status).toBe(403);
  });

  it("deletes the collaborator row when owner", async () => {
    const res = await DELETE(new Request("http://localhost"), ctx("c1") as never);
    expect(res.status).toBe(200);
    expect(mockDeleteResult).toHaveBeenCalled();
  });

  it("surfaces supabase errors", async () => {
    mockDeleteResult.mockResolvedValue({ error: { message: "db down", code: "500" } });
    const res = await DELETE(new Request("http://localhost"), ctx("c1") as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
