import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockSelectSingle = vi.fn();
const mockDeleteResult = vi.fn();

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
  });
  mockSelectSingle.mockResolvedValue({ data: { id: "a1", file_name: "x.pdf" } });
  mockDeleteResult.mockResolvedValue({ error: null });
});

describe("DELETE /api/attachments/[id]", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(new Request("http://localhost"), ctx("a1") as never);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the attachment does not belong to the wedding", async () => {
    mockSelectSingle.mockResolvedValue({ data: null });
    const res = await DELETE(new Request("http://localhost"), ctx("a1") as never);
    expect(res.status).toBe(404);
  });

  it("deletes the attachment row on success", async () => {
    const res = await DELETE(new Request("http://localhost"), ctx("a1") as never);
    expect(res.status).toBe(200);
    expect(mockDeleteResult).toHaveBeenCalled();
  });

  it("surfaces supabase errors from the delete", async () => {
    mockDeleteResult.mockResolvedValue({ error: { message: "db down", code: "500" } });
    const res = await DELETE(new Request("http://localhost"), ctx("a1") as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
