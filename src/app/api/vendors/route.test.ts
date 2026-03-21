 
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Supabase query builder mock
function createMockSupabase(overrides: { selectData?: unknown[]; insertData?: unknown; error?: unknown } = {}) {
  const chain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => ({ data: overrides.selectData ?? [], error: null })),
        })),
      })),
    })),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: overrides.insertData ?? { id: "v-1" }, error: overrides.error ?? null }),
  };
  chain.insert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: chain.single }) });
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getWeddingForUser: (...args: unknown[]) => mockGetWeddingForUser(...args) }));

vi.mock("@/lib/audit", () => ({
  logActivity: vi.fn(),
  softDelete: vi.fn(() => Promise.resolve({ error: null })),
}));

import { GET, POST } from "./route";

describe("GET /api/vendors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns vendor list", async () => {
    const vendors = [{ id: "v-1", name: "DJ Cool" }, { id: "v-2", name: "Florist" }];
    const supabase = createMockSupabase({ selectData: vendors });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(vendors);
    expect(supabase.from).toHaveBeenCalledWith("vendors");
  });
});

describe("POST /api/vendors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates vendor with valid data", async () => {
    const created = { id: "v-1", name: "DJ Cool", category: "music" };
    const supabase = createMockSupabase({ insertData: created });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ name: "DJ Cool", category: "music" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(created);
  });

  it("returns 400 when name missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ category: "music" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/name/i);
  });

  it("returns 400 when category missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ name: "DJ Cool" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/category/i);
  });

  it("validates status enum if provided", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ name: "DJ Cool", category: "music", status: "invalid" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/status/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(mockRequest({ name: "DJ Cool", category: "music" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});
