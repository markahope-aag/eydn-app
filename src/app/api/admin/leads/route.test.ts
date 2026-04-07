import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- Mock admin module ---

const mockRequireAdmin = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

import { GET as _GET } from "./route";

// The route always returns a NextResponse, but TS infers it could be undefined.
// Wrap to satisfy TS in tests.
async function GET() {
  const res = await _GET();
  if (!res) throw new Error("GET returned undefined");
  return res;
}

function createMockSupabase(overrides: {
  waitlist?: unknown[];
  calculator?: unknown[];
} = {}) {
  const { waitlist = [], calculator = [] } = overrides;

  return {
    from: vi.fn((table: string) => {
      if (table === "waitlist") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: waitlist, error: null }),
          }),
        };
      }
      if (table === "calculator_saves") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: calculator, error: null }),
          }),
        };
      }
      return {};
    }),
  };
}

describe("GET /api/admin/leads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns empty array when no leads exist", async () => {
    const supabase = createMockSupabase();
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it("returns waitlist leads with correct source", async () => {
    const supabase = createMockSupabase({
      waitlist: [
        { name: "Alice", email: "alice@test.com", source: "homepage", created_at: "2026-01-01T00:00:00Z" },
      ],
    });
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].email).toBe("alice@test.com");
    expect(json[0].source).toBe("homepage");
  });

  it("returns calculator leads with details", async () => {
    const supabase = createMockSupabase({
      calculator: [
        {
          name: "Bob",
          email: "bob@test.com",
          budget: 25000,
          guests: 100,
          state: "CA",
          month: 6,
          created_at: "2026-02-01T00:00:00Z",
        },
      ],
    });
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].source).toBe("calculator");
    expect(json[0].details).toContain("25,000");
    expect(json[0].details).toContain("100 guests");
    expect(json[0].details).toContain("CA");
  });

  it("deduplicates leads by email, keeping earliest source", async () => {
    const supabase = createMockSupabase({
      waitlist: [
        { name: "Alice", email: "alice@test.com", source: "homepage", created_at: "2026-01-01T00:00:00Z" },
      ],
      calculator: [
        {
          name: "Alice Smith",
          email: "alice@test.com",
          budget: 20000,
          guests: 80,
          state: "NY",
          month: 9,
          created_at: "2026-01-15T00:00:00Z",
        },
      ],
    });
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    // Should be deduplicated to 1 entry
    expect(json).toHaveLength(1);
    // Sources should be merged
    expect(json[0].source).toContain("homepage");
    expect(json[0].source).toContain("calculator");
  });

  it("merges details from later source when first has none", async () => {
    const supabase = createMockSupabase({
      waitlist: [
        { name: null, email: "anon@test.com", source: "waitlist", created_at: "2026-01-01T00:00:00Z" },
      ],
      calculator: [
        {
          name: "Anon User",
          email: "anon@test.com",
          budget: 15000,
          guests: 50,
          state: "TX",
          month: 4,
          created_at: "2026-02-01T00:00:00Z",
        },
      ],
    });
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    // Name should be merged from calculator since waitlist had null
    expect(json[0].name).toBe("Anon User");
    // Details from calculator should be merged
    expect(json[0].details).toBeTruthy();
  });

  it("sorts leads by date descending", async () => {
    const supabase = createMockSupabase({
      waitlist: [
        { name: "Old", email: "old@test.com", source: "waitlist", created_at: "2026-01-01T00:00:00Z" },
        { name: "New", email: "new@test.com", source: "waitlist", created_at: "2026-03-01T00:00:00Z" },
      ],
    });
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    // Newer entry first
    expect(json[0].email).toBe("new@test.com");
    expect(json[1].email).toBe("old@test.com");
  });

  it("handles null waitlist data gracefully", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "waitlist") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "calculator_saves") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {};
      }),
    };
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", supabase });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });
});
