import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockWedding = { id: "wedding-1", user_id: "user-1" };

type FromCall = {
  table: string;
  method: string;
  payload?: unknown;
  eqWedding?: unknown;
  inIds?: unknown;
};

function createMockSupabase(
  overrides: {
    insertData?: unknown[];
    insertError?: { message: string } | null;
    updateData?: unknown[];
    updateError?: { message: string } | null;
  } = {}
) {
  const {
    insertData = [],
    insertError = null,
    updateData = [],
    updateError = null,
  } = overrides;

  const calls: FromCall[] = [];

  const supabase = {
    from: vi.fn((table: string) => {
      const chain = {
        insert: vi.fn((payload: unknown) => {
          calls.push({ table, method: "insert", payload });
          return {
            select: vi.fn(() => Promise.resolve({ data: insertData, error: insertError })),
          };
        }),
        update: vi.fn((payload: unknown) => {
          calls.push({ table, method: "update", payload });
          // Chainable: .eq(wedding_id).in(ids).select()
          return {
            eq: vi.fn((_col: string, val: unknown) => {
              const last = calls[calls.length - 1];
              if (last) last.eqWedding = val;
              return {
                in: vi.fn((_col2: string, ids: unknown) => {
                  const last2 = calls[calls.length - 1];
                  if (last2) last2.inIds = ids;
                  return {
                    select: vi.fn(() => Promise.resolve({ data: updateData, error: updateError })),
                  };
                }),
              };
            }),
          };
        }),
      };
      return chain;
    }),
  };

  return { supabase, calls };
}

let mockInstance = createMockSupabase();

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: vi.fn(() => ({
    wedding: mockWedding,
    supabase: mockInstance.supabase,
    userId: "user-1",
    role: "owner",
  })),
}));

vi.mock("@/lib/audit", () => ({
  logActivity: vi.fn(),
  notifyCollaborators: vi.fn(),
}));

vi.mock("@/lib/validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validation")>();
  return { ...actual };
});

vi.mock("@/lib/api-error", () => ({
  supabaseError: (err: { message: string } | null) => {
    if (!err) return null;
    return {
      status: 500,
      body: { error: err.message },
    };
  },
}));

import { POST, PATCH, DELETE } from "./route";

function jsonRequest(body: unknown, method: string = "POST"): Request {
  return new Request("http://localhost/api/guests/bulk", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── POST (insert) ───────────────────────────────────────────────

describe("POST /api/guests/bulk", () => {
  it("rejects when guests is not an array", async () => {
    const res = await POST(jsonRequest({ guests: "not an array" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/must be an array/);
  });

  it("rejects when guests is an empty array", async () => {
    const res = await POST(jsonRequest({ guests: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/empty/);
  });

  it("rejects when more than 500 guests are submitted", async () => {
    const guests = Array.from({ length: 501 }, (_, i) => ({ name: `G${i}` }));
    const res = await POST(jsonRequest({ guests }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/500/);
  });

  it("drops rows with missing names and reports them in skipped", async () => {
    mockInstance = createMockSupabase({
      insertData: [{ id: "g_1", name: "Valid" }],
    });

    const res = await POST(
      jsonRequest({
        guests: [{ name: "Valid" }, { name: "" }, { name: "  " }, null],
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.inserted).toBe(1);
    expect(data.skipped).toBe(3);
    expect(data.skippedDetails).toHaveLength(3);
  });

  it("drops rows with invalid emails", async () => {
    mockInstance = createMockSupabase({
      insertData: [{ id: "g_1", name: "Alice" }],
    });

    const res = await POST(
      jsonRequest({
        guests: [
          { name: "Alice", email: "alice@example.com" },
          { name: "Bob", email: "not-an-email" },
        ],
      })
    );

    const data = await res.json();
    expect(data.inserted).toBe(1);
    expect(data.skipped).toBe(1);
    expect(data.skippedDetails[0].reason).toMatch(/invalid email/);
  });

  it("rejects with 400 when all rows are invalid", async () => {
    const res = await POST(jsonRequest({ guests: [{ name: "" }, null] }));
    expect(res.status).toBe(400);
  });

  it("shapes valid rows with wedding_id and defaults", async () => {
    mockInstance = createMockSupabase({
      insertData: [{ id: "g_1", name: "Alice" }],
    });

    await POST(jsonRequest({ guests: [{ name: "Alice", email: "a@b.com", phone: "555" }] }));

    const insertCall = mockInstance.calls.find((c) => c.method === "insert");
    expect(insertCall).toBeDefined();
    const rows = insertCall?.payload as Array<{ wedding_id: string; name: string; plus_one: boolean }>;
    expect(rows[0].wedding_id).toBe(mockWedding.id);
    expect(rows[0].name).toBe("Alice");
    expect(rows[0].plus_one).toBe(false);
  });
});

// ─── PATCH (bulk update) ─────────────────────────────────────────

describe("PATCH /api/guests/bulk", () => {
  it("rejects when ids is missing", async () => {
    const res = await PATCH(jsonRequest({ updates: { rsvp_status: "accepted" } }, "PATCH"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/ids must be/);
  });

  it("rejects when ids is empty", async () => {
    const res = await PATCH(
      jsonRequest({ ids: [], updates: { rsvp_status: "accepted" } }, "PATCH")
    );
    expect(res.status).toBe(400);
  });

  it("rejects when updates is missing", async () => {
    const res = await PATCH(jsonRequest({ ids: ["a"] }, "PATCH"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/updates/);
  });

  it("rejects when updates has no allowed fields", async () => {
    const res = await PATCH(
      jsonRequest({ ids: ["a"], updates: { evil: "value" } }, "PATCH")
    );
    expect(res.status).toBe(400);
  });

  it("updates and scopes by wedding_id", async () => {
    mockInstance = createMockSupabase({
      updateData: [
        { id: "g_1", rsvp_status: "accepted" },
        { id: "g_2", rsvp_status: "accepted" },
      ],
    });

    const res = await PATCH(
      jsonRequest(
        { ids: ["g_1", "g_2"], updates: { rsvp_status: "accepted" } },
        "PATCH"
      )
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toBe(2);
    expect(data.requested).toBe(2);

    const updateCall = mockInstance.calls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    expect(updateCall?.eqWedding).toBe(mockWedding.id);
    expect(updateCall?.inIds).toEqual(["g_1", "g_2"]);
    expect((updateCall?.payload as { rsvp_status: string }).rsvp_status).toBe("accepted");
  });

  it("returns partial count when some ids don't match", async () => {
    mockInstance = createMockSupabase({
      updateData: [{ id: "g_1", rsvp_status: "accepted" }],
    });

    const res = await PATCH(
      jsonRequest(
        { ids: ["g_1", "g_2", "g_3"], updates: { rsvp_status: "accepted" } },
        "PATCH"
      )
    );

    const data = await res.json();
    expect(data.updated).toBe(1);
    expect(data.requested).toBe(3);
  });

  it("accepts group_name and strips non-allowlisted fields", async () => {
    mockInstance = createMockSupabase({
      updateData: [{ id: "g_1" }],
    });

    await PATCH(
      jsonRequest(
        { ids: ["g_1"], updates: { group_name: "Family", hacked: "foo" } },
        "PATCH"
      )
    );

    const updateCall = mockInstance.calls.find((c) => c.method === "update");
    expect(updateCall?.payload).toEqual({ group_name: "Family" });
    expect(updateCall?.payload).not.toHaveProperty("hacked");
  });

  it("rejects when more than 1000 ids are submitted", async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `g_${i}`);
    const res = await PATCH(
      jsonRequest({ ids, updates: { rsvp_status: "accepted" } }, "PATCH")
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/1000/);
  });
});

// ─── DELETE (bulk soft-delete) ───────────────────────────────────

describe("DELETE /api/guests/bulk", () => {
  function deleteRequest(ids: string | null): Request {
    const url =
      ids !== null
        ? `http://localhost/api/guests/bulk?ids=${ids}`
        : "http://localhost/api/guests/bulk";
    return new Request(url, { method: "DELETE" });
  }

  it("rejects when ids query param is missing", async () => {
    const res = await DELETE(deleteRequest(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/ids query param/);
  });

  it("rejects when ids param is empty", async () => {
    const res = await DELETE(deleteRequest(""));
    expect(res.status).toBe(400);
  });

  it("soft-deletes by setting deleted_at and scoping wedding_id", async () => {
    mockInstance = createMockSupabase({
      updateData: [{ id: "g_1" }, { id: "g_2" }],
    });

    const res = await DELETE(deleteRequest("g_1,g_2"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(2);
    expect(data.requested).toBe(2);

    const updateCall = mockInstance.calls.find((c) => c.method === "update");
    expect((updateCall?.payload as { deleted_at: string }).deleted_at).toBeDefined();
    expect(updateCall?.eqWedding).toBe(mockWedding.id);
    expect(updateCall?.inIds).toEqual(["g_1", "g_2"]);
  });

  it("trims whitespace around comma-separated ids", async () => {
    mockInstance = createMockSupabase({
      updateData: [{ id: "g_1" }],
    });

    await DELETE(deleteRequest("g_1 , , g_2"));

    const updateCall = mockInstance.calls.find((c) => c.method === "update");
    expect(updateCall?.inIds).toEqual(["g_1", "g_2"]);
  });

  it("rejects when more than 1000 ids are submitted", async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `g_${i}`).join(",");
    const res = await DELETE(deleteRequest(ids));
    expect(res.status).toBe(400);
  });
});
