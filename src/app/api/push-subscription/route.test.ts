import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- Mock auth ---

const mockGetWeddingForUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

vi.mock("@/lib/api-error", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-error")>();
  return { ...actual };
});

vi.mock("@/lib/validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validation")>();
  return { ...actual };
});

import { POST, DELETE } from "./route";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function createMockSupabase(overrides: {
  upsertError?: { message: string } | null;
} = {}) {
  const { upsertError = null } = overrides;
  const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
  const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });

  return {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: upsertError }),
      delete: vi.fn().mockReturnValue({
        eq: deleteEq1,
      }),
    }),
    _deleteEq1: deleteEq1,
  };
}

function mockPostRequest(body: unknown): Request {
  return new Request("http://localhost/api/push-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockDeleteRequest(): Request {
  return new Request("http://localhost/api/push-subscription", {
    method: "DELETE",
  });
}

describe("POST /api/push-subscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(mockPostRequest({ subscription: { endpoint: "https://push.example.com" } }));
    expect(res.status).toBe(401);
  });

  it("returns 400 with malformed JSON", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
    });

    const req = new Request("http://localhost/api/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/json/i);
  });

  it("returns 400 when subscription is missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
    });

    const res = await POST(mockPostRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/push subscription required/i);
  });

  it("returns 400 when subscription has no endpoint", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
    });

    const res = await POST(mockPostRequest({ subscription: {} }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/push subscription required/i);
  });

  it("upserts subscription and returns success", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
    });

    const res = await POST(mockPostRequest({
      subscription: {
        endpoint: "https://push.example.com/sub/123",
        keys: { p256dh: "key1", auth: "key2" },
      },
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 500 when upsert fails", async () => {
    const supabase = createMockSupabase({
      upsertError: { message: "constraint violation" },
    });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
    });

    const res = await POST(mockPostRequest({
      subscription: { endpoint: "https://push.example.com" },
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/internal server error/i);
  });
});

describe("DELETE /api/push-subscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await DELETE(mockDeleteRequest());
    expect(res.status).toBe(401);
  });

  it("deletes subscription and returns success", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
    });

    const res = await DELETE(mockDeleteRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
