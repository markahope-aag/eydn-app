 
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockSupabase(overrides: { selectData?: unknown[]; insertData?: unknown; vendorData?: unknown[]; error?: unknown } = {}) {
  const chain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => ({ data: overrides.selectData ?? [], error: null })),
        })),
      })),
    })),
    in: vi.fn().mockResolvedValue({ data: overrides.vendorData ?? [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: overrides.insertData ?? { id: "e-1" }, error: overrides.error ?? null }),
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

describe("GET /api/expenses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns expenses", async () => {
    const expenses = [{ id: "e-1", description: "Flowers", vendor_id: null }];
    const supabase = createMockSupabase({ selectData: expenses });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([{ ...expenses[0], vendor_name: null }]);
  });
});

describe("POST /api/expenses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates expense with valid data", async () => {
    const created = { id: "e-1", description: "Flowers", category: "decor", estimated: 500 };
    const supabase = createMockSupabase({ insertData: created });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ description: "Flowers", category: "decor", estimated: 500 }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(created);
  });

  it("returns 400 when description missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ category: "decor" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/description/i);
  });

  it("returns 400 when category missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ description: "Flowers" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/category/i);
  });

  it("validates numeric fields", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ description: "Flowers", category: "decor", estimated: -5 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/estimated/i);
  });
});
