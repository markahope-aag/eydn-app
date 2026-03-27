import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getWeddingForUser } from "./auth";

// --- Helpers ---

const fakeWedding = {
  id: "w-1",
  user_id: "user-1",
  partner1_name: "Alice",
  partner2_name: "Bob",
  date: null,
  venue: null,
  budget: null,
  guest_count_estimate: null,
  style_description: null,
  has_wedding_party: null,
  wedding_party_count: null,
  has_pre_wedding_events: null,
  has_honeymoon: null,
  trial_started_at: null,
  website_slug: null,
  website_enabled: false,
  website_headline: null,
  website_story: null,
  website_cover_url: null,
  website_schedule: [],
  website_travel_info: null,
  website_accommodations: null,
  website_faq: [],
  website_couple_photo_url: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

/**
 * Build a mock supabase client. `tableConfigs` maps table name to an array
 * of successive results returned by `.single()` calls for that table.
 * The index advances each time `.single()` is called on a chain from that table.
 */
function createMockSupabase(
  tableConfigs: Record<string, { data: unknown; error: unknown }[]> = {},
) {
  const callIndices: Record<string, number> = {};
  const updateCalls: { table: string; values: unknown; eqCalls: [string, unknown][] }[] = [];

  type QueryChain = Record<string, ReturnType<typeof vi.fn>>;

  const supabase = {
    from: vi.fn((table: string) => {
      if (!(table in callIndices)) callIndices[table] = 0;

      function nextResult() {
        const results = tableConfigs[table] ?? [{ data: null, error: null }];
        const idx = callIndices[table];
        callIndices[table]++;
        return results[idx] ?? { data: null, error: null };
      }

      function makeQueryChain(): QueryChain {
        const chain: QueryChain = {
          eq: vi.fn(() => chain),
          single: vi.fn(() => nextResult()),
          order: vi.fn(() => nextResult()),
        };
        return chain;
      }

      return {
        select: vi.fn(() => makeQueryChain()),
        update: vi.fn((values: unknown) => {
          const entry = { table, values, eqCalls: [] as [string, unknown][] };
          updateCalls.push(entry);
          const chain: QueryChain = {
            eq: vi.fn((col: string, val: unknown) => {
              entry.eqCalls.push([col, val]);
              return chain;
            }),
          };
          return chain;
        }),
      };
    }),
    _updateCalls: updateCalls,
  };

  return supabase;
}

// --- Tests ---

describe("getWeddingForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 error when userId is null", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);

    const result = await getWeddingForUser();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect((result.error as { status: number }).status).toBe(401);
    }
  });

  it("returns wedding with role 'owner' when direct ownership found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as unknown as Awaited<ReturnType<typeof auth>>);

    const supabase = createMockSupabase({
      weddings: [{ data: fakeWedding, error: null }],
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);

    const result = await getWeddingForUser();

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.role).toBe("owner");
      expect(result.wedding).toEqual(fakeWedding);
      expect(result.userId).toBe("user-1");
    }
  });

  it("returns wedding with role from accepted collaborator when owner lookup fails", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-2" } as unknown as Awaited<ReturnType<typeof auth>>);

    const collabRecord = { wedding_id: "w-1", role: "partner" };

    const supabase = createMockSupabase({
      // 1st weddings call: owner check -> null; 2nd: fetch wedding by collab.wedding_id -> found
      weddings: [
        { data: null, error: null },
        { data: fakeWedding, error: null },
      ],
      // 1st collab call: accepted collaborator lookup -> found
      wedding_collaborators: [{ data: collabRecord, error: null }],
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);

    const result = await getWeddingForUser();

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.role).toBe("partner");
      expect(result.wedding).toEqual(fakeWedding);
      expect(result.userId).toBe("user-2");
    }
  });

  it("returns coordinator role from collaborator record", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-3" } as unknown as Awaited<ReturnType<typeof auth>>);

    const collabRecord = { wedding_id: "w-1", role: "coordinator" };

    const supabase = createMockSupabase({
      weddings: [
        { data: null, error: null },
        { data: fakeWedding, error: null },
      ],
      wedding_collaborators: [{ data: collabRecord, error: null }],
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);

    const result = await getWeddingForUser();

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.role).toBe("coordinator");
    }
  });

  it("auto-accepts pending invite when email matches", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-4" } as unknown as Awaited<ReturnType<typeof auth>>);

    const pendingRecord = { id: "collab-99", wedding_id: "w-1", role: "partner" };

    const supabase = createMockSupabase({
      // 1st: owner check -> null; 2nd: fetch wedding after auto-accept -> found
      weddings: [
        { data: null, error: null },
        { data: fakeWedding, error: null },
      ],
      // 1st: accepted collab lookup -> null; 2nd: pending by email -> found
      wedding_collaborators: [
        { data: null, error: null },
        { data: pendingRecord, error: null },
      ],
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);

    const mockClerkClientInstance = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "alice@example.com" }],
        }),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClerkClientInstance as unknown as Awaited<ReturnType<typeof clerkClient>>);

    const result = await getWeddingForUser();

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.role).toBe("partner");
      expect(result.wedding).toEqual(fakeWedding);
      expect(result.userId).toBe("user-4");
    }
  });

  it("auto-accept updates the collaborator record with user_id and accepted status", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-5" } as unknown as Awaited<ReturnType<typeof auth>>);

    const pendingRecord = { id: "collab-42", wedding_id: "w-1", role: "coordinator" };

    const supabase = createMockSupabase({
      weddings: [
        { data: null, error: null },
        { data: fakeWedding, error: null },
      ],
      wedding_collaborators: [
        { data: null, error: null },
        { data: pendingRecord, error: null },
      ],
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);

    const mockClerkClientInstance = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "bob@example.com" }],
        }),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClerkClientInstance as unknown as Awaited<ReturnType<typeof clerkClient>>);

    await getWeddingForUser();

    // Verify the update call was made on wedding_collaborators
    const updates = supabase._updateCalls.filter(
      (c) => c.table === "wedding_collaborators",
    );
    expect(updates.length).toBe(1);
    expect(updates[0].values).toEqual({
      user_id: "user-5",
      invite_status: "accepted",
    });
    expect(updates[0].eqCalls).toContainEqual(["id", "collab-42"]);
  });

  it("returns 404 when no ownership, no collaborator, and no pending invite", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-6" } as unknown as Awaited<ReturnType<typeof auth>>);

    const supabase = createMockSupabase({
      weddings: [{ data: null, error: null }],
      wedding_collaborators: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as unknown as ReturnType<typeof createSupabaseAdmin>);

    const mockClerkClientInstance = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          emailAddresses: [{ emailAddress: "nobody@example.com" }],
        }),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClerkClientInstance as unknown as Awaited<ReturnType<typeof clerkClient>>);

    const result = await getWeddingForUser();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect((result.error as { status: number }).status).toBe(404);
    }
  });
});
