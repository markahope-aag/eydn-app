 
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/wedding-party", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockSupabase(overrides: { selectData?: unknown[]; insertData?: unknown; error?: unknown } = {}) {
  // Flexible chain that returns itself for any method call
  const flexChain: Record<string, unknown> = {};
  const methods = ["select", "eq", "is", "order", "limit", "single", "insert", "delete"];
  for (const m of methods) {
    flexChain[m] = vi.fn().mockReturnValue(flexChain);
  }
  // Terminal methods
  flexChain.order = vi.fn().mockReturnValue({ data: overrides.selectData ?? [], error: null });
  flexChain.single = vi.fn().mockResolvedValue({ data: overrides.insertData ?? { id: "wp-1" }, error: overrides.error ?? null });
  // Insert chain
  flexChain.insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: overrides.insertData ?? { id: "wp-1" }, error: overrides.error ?? null }),
    }),
  });
  return {
    from: vi.fn().mockReturnValue(flexChain),
    _chain: flexChain,
  };
}

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getWeddingForUser: (...args: unknown[]) => mockGetWeddingForUser(...args) }));

vi.mock("@/lib/audit", () => ({
  logActivity: vi.fn(),
  softDelete: vi.fn(() => Promise.resolve({ error: null })),
}));

import { GET, POST } from "./route";

describe("GET /api/wedding-party", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns party members", async () => {
    const members = [{ id: "wp-1", name: "Alice", role: "bridesmaid" }];
    const supabase = createMockSupabase({ selectData: members });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(members);
    expect(supabase.from).toHaveBeenCalledWith("wedding_party");
  });
});

describe("POST /api/wedding-party", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates member with valid data", async () => {
    const created = { id: "wp-1", name: "Alice", role: "bridesmaid" };
    const supabase = createMockSupabase({ insertData: created });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ name: "Alice", role: "bridesmaid" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(created);
  });

  it("returns 400 when name missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ role: "bridesmaid" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/name/i);
  });

  it("returns 400 when role missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ name: "Alice" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/role/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(mockRequest({ name: "Alice", role: "bridesmaid" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});
