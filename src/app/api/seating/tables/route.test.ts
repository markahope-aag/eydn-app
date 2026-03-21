 
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/seating/tables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
    single: vi.fn().mockResolvedValue({ data: overrides.insertData ?? { id: "st-1" }, error: overrides.error ?? null }),
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

describe("GET /api/seating/tables", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tables", async () => {
    const tables = [{ id: "st-1", table_number: 1 }, { id: "st-2", table_number: 2 }];
    const supabase = createMockSupabase({ selectData: tables });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(tables);
    expect(supabase.from).toHaveBeenCalledWith("seating_tables");
  });
});

describe("POST /api/seating/tables", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates table with valid data", async () => {
    const created = { id: "st-1", table_number: 1, shape: "round", capacity: 8 };
    const supabase = createMockSupabase({ insertData: created });
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ table_number: 1, shape: "round", capacity: 8 }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(created);
  });

  it("returns 400 when table_number missing", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ shape: "round" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/table_number/i);
  });

  it("validates shape enum", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ table_number: 1, shape: "hexagon" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/shape/i);
  });

  it("validates capacity is positive", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({ wedding: mockWedding, supabase, userId: "user-1", role: "owner" });

    const res = await POST(mockRequest({ table_number: 1, capacity: 0 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/capacity/i);
  });
});
