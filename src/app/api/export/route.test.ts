import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

// Every query resolves to { data: [] } unless overridden per-table.
const tableOverrides: Record<string, { data: unknown; error?: unknown }> = {};

function makeChain(table: string): unknown {
  const result = tableOverrides[table] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  const noop = vi.fn(() => chain);
  chain.select = noop;
  chain.eq = noop;
  chain.is = noop;
  chain.order = noop;
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function makeSupabase() {
  return {
    from: vi.fn((table: string) => makeChain(table)),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  untypedClient: (client: unknown) => client,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(tableOverrides)) delete tableOverrides[k];
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1", partner1_name: "Alice", partner2_name: "Bob" },
    supabase: makeSupabase(),
  });
});

describe("GET /api/export", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns a complete wedding export envelope", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      metadata: expect.objectContaining({ weddingId: "wed_1", version: "1.0" }),
      wedding: expect.objectContaining({ id: "wed_1" }),
      guests: [],
      vendors: [],
      tasks: [],
      expenses: [],
      weddingParty: [],
      seatingTables: [],
      seatAssignments: [],
      ceremonyPositions: [],
      chatMessages: [],
      moodBoard: [],
      registryLinks: [],
    });
  });

  it("includes populated data when tables have rows", async () => {
    tableOverrides.guests = { data: [{ id: "g1", name: "Carol" }] };
    tableOverrides.vendors = { data: [{ id: "v1", name: "Florist" }] };
    mockGetWeddingForUser.mockResolvedValue({
      wedding: { id: "wed_1" },
      supabase: makeSupabase(),
    });

    const res = await GET();
    const body = await res.json();
    expect(body.guests).toHaveLength(1);
    expect(body.vendors).toHaveLength(1);
  });
});
