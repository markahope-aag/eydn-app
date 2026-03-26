import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/date-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockSupabase(overrides: {
  selectData?: unknown[];
  updateError?: unknown;
  selectError?: unknown;
} = {}) {
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  // Terminal eq resolves
  updateChain.eq.mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: overrides.updateError ?? null }),
  }));

  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: overrides.selectData ?? [],
      error: overrides.selectError ?? null,
    }),
  };
  // Chain two .eq() calls before .order()
  selectChain.eq.mockReturnThis();

  return {
    from: vi.fn((table: string) => {
      if (table === "date_change_alerts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: overrides.selectData ?? [],
                  error: overrides.selectError ?? null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: overrides.updateError ?? null }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: (...args: unknown[]) => mockGetWeddingForUser(...args),
}));

import { GET, POST } from "./route";

describe("GET /api/date-alerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns unacknowledged alerts for the wedding", async () => {
    const alerts = [
      {
        id: "alert-1",
        wedding_id: "wedding-1",
        change_type: "wedding_date",
        old_value: "2026-06-01",
        new_value: "2026-07-01",
        acknowledged: false,
        message: "Your wedding date changed.",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const supabase = createMockSupabase({ selectData: alerts });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(alerts);
  });

  it("returns an empty array when no unacknowledged alerts exist", async () => {
    const supabase = createMockSupabase({ selectData: [] });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it("returns 500 when a database error occurs", async () => {
    const supabase = createMockSupabase({
      selectError: { message: "DB connection failed" },
    });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/internal server error/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/date-alerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acknowledges an alert by id and returns success", async () => {
    const supabase = createMockSupabase({ updateError: null });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await POST(mockRequest({ alert_id: "alert-1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 when alert_id is missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await POST(mockRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/alert_id/i);
  });

  it("returns 400 with malformed JSON", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const req = new Request("http://localhost/api/date-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/json/i);
  });

  it("returns 500 when database update fails", async () => {
    const supabase = createMockSupabase({
      updateError: { message: "update failed" },
    });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await POST(mockRequest({ alert_id: "alert-1" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/internal server error/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(mockRequest({ alert_id: "alert-1" }));
    expect(res.status).toBe(401);
  });
});
