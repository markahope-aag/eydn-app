import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/ceremony", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockSupabase(overrides: { selectData?: unknown[]; insertData?: unknown; error?: unknown } = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: overrides.selectData ?? [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: overrides.insertData ?? { id: "cp-1" }, error: overrides.error ?? null }),
  };
  chain.insert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: chain.single }) });
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getWeddingForUser: (...args: unknown[]) => mockGetWeddingForUser(...args) }));

import { GET, POST, DELETE } from "./route";

describe("GET /api/ceremony", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ceremony positions", async () => {
    const positions = [
      { id: "cp-1", person_name: "Rev. Smith", person_type: "officiant", side: "center" },
      { id: "cp-2", person_name: "Alice", person_type: "wedding_party", side: "left" },
    ];
    const supabase = createMockSupabase({ selectData: positions });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(positions);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/ceremony", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a position by id", async () => {
    const supabase = createMockSupabase();
    // Add delete chain
    (supabase._chain as Record<string, unknown>).delete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const request = new Request("http://localhost/api/ceremony?id=cp-1", { method: "DELETE" });
    const res = await DELETE(request);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 when id is missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const request = new Request("http://localhost/api/ceremony", { method: "DELETE" });
    const res = await DELETE(request);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/id/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost/api/ceremony?id=cp-1", { method: "DELETE" });
    const res = await DELETE(request);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/ceremony", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates position with valid data", async () => {
    const created = { id: "cp-1", person_name: "Rev. Smith", person_type: "officiant" };
    const supabase = createMockSupabase({ insertData: created });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ person_name: "Rev. Smith", person_type: "officiant" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(created);
  });

  it("returns 400 when person_name missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ person_type: "officiant" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/person_name/i);
  });

  it("returns 400 when person_type missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ person_name: "Rev. Smith" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/person_type/i);
  });

  it("validates person_type enum", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ person_name: "Rev. Smith", person_type: "random" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/person_type/i);
  });

  it("validates side enum if provided", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ person_name: "Alice", person_type: "wedding_party", side: "top" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/side/i);
  });
});
