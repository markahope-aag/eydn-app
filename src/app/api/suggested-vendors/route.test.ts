import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockQueryResult = vi.fn();

// Track whether ilike/or were called for a pattern assertion.
const callLog: Record<string, number> = {};

function makeChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const track = (name: string) =>
    vi.fn(() => {
      callLog[name] = (callLog[name] || 0) + 1;
      return chain;
    });
  chain.eq = track("eq");
  chain.ilike = track("ilike");
  chain.or = track("or");
  chain.order = track("order");
  chain.range = vi.fn(() => {
    callLog.range = (callLog.range || 0) + 1;
    return mockQueryResult();
  });
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => makeChain()),
      insert: vi.fn(() => ({
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      })),
    })),
  }),
}));

import { GET } from "./route";

function getReq(query: string = ""): Request {
  return new Request(`http://localhost/api/suggested-vendors${query}`, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(callLog)) delete callLog[k];
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockQueryResult.mockResolvedValue({ data: [], count: 0, error: null });
});

describe("GET /api/suggested-vendors", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("returns a paginated envelope", async () => {
    mockQueryResult.mockResolvedValue({
      data: [{ id: "v1", name: "Aster Florals", featured: true }],
      count: 1,
      error: null,
    });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vendors).toHaveLength(1);
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
      hasMore: false,
    });
  });

  it("returns vendors in the order Postgres returned them (featured-first sort is server-side)", async () => {
    mockQueryResult.mockResolvedValue({
      data: [
        { id: "a", name: "Aster", featured: false },
        { id: "b", name: "Budgeted Flowers", featured: true },
      ],
      count: 2,
      error: null,
    });
    const res = await GET(getReq());
    const body = await res.json();
    // Order is preserved as-is from Postgres (which already sorts featured first).
    expect(body.vendors.map((v: { id: string }) => v.id)).toEqual(["a", "b"]);
  });

  it("uses full-text OR ilike search when q is provided", async () => {
    const res = await GET(getReq("?q=aust"));
    expect(res.status).toBe(200);
    expect(callLog.or).toBeGreaterThan(0);
  });

  it("filters by category and state via eq", async () => {
    const res = await GET(getReq("?category=florist&state=CA"));
    expect(res.status).toBe(200);
    // active + category + state = 3 eq calls
    expect(callLog.eq).toBeGreaterThanOrEqual(3);
  });

  it("clamps page and limit to safe ranges", async () => {
    const res = await GET(getReq("?page=-5&limit=500"));
    const body = await res.json();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(100);
  });
});
