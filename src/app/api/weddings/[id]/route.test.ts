import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockWedding = {
  id: "wedding-1",
  user_id: "user-1",
  date: "2026-06-01",
  ceremony_time: "16:00",
};

type RouteContext = { params: Promise<{ id: string }> };

function makeCtx(id = "wedding-1"): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/weddings/wedding-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Build a mock Supabase client flexible enough to handle the cascade operations
 * in the weddings PATCH route.
 */
function createMockSupabase(overrides: {
  weddingData?: Record<string, unknown>;
  weddingError?: unknown;
  tasks?: unknown[];
} = {}) {
  const weddingData = overrides.weddingData ?? {
    id: "wedding-1",
    date: "2026-07-01",
    ceremony_time: "16:00",
  };

  // Reusable terminal .single() that returns the updated wedding row
  const weddingSingle = vi.fn().mockResolvedValue({
    data: weddingData,
    error: overrides.weddingError ?? null,
  });

  // The tasks query returns .not().is().null chain resolved with tasks array
  const tasksResolvedValue = {
    data: overrides.tasks ?? [],
    error: null,
  };

  // day_of_plans single row (for ceremony_time cascade)
  const dayOfPlanSingle = vi.fn().mockResolvedValue({
    data: { id: "dop-1", content: { ceremonyTime: "16:00" } },
    error: null,
  });

  const from = vi.fn((table: string) => {
    if (table === "weddings") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: weddingSingle,
            }),
          }),
        }),
      };
    }

    if (table === "rehearsal_dinner") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }

    if (table === "tasks") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue(tasksResolvedValue),
              // no-old-date path: select().eq().is() resolves directly
              then: (resolve: (_v: unknown) => void) => resolve(tasksResolvedValue),
            }),
            // no-old-date path: select().eq() resolves directly
            then: undefined,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }

    if (table === "date_change_alerts") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }

    if (table === "day_of_plans") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: dayOfPlanSingle,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }

    return {};
  });

  return { from, _weddingSingle: weddingSingle };
}

const mockGetWeddingForUser = vi.fn();
const mockInvalidateWeddingCache = vi.fn();

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: (...args: unknown[]) => mockGetWeddingForUser(...args),
  invalidateWeddingCache: (...args: unknown[]) => mockInvalidateWeddingCache(...args),
}));

import { PATCH } from "./route";

describe("PATCH /api/weddings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when the route id does not match the user's wedding", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ venue: "The Grand Hall" }), makeCtx("wedding-OTHER"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 400 when no allowed fields are provided", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ unknown_field: "value" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no valid fields/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await PATCH(mockRequest({ venue: "The Grand Hall" }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 with malformed JSON", async () => {
    const supabase = createMockSupabase();
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const req = new Request("http://localhost/api/weddings/wedding-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await PATCH(req, makeCtx());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/json/i);
  });

  it("returns 500 when the database update fails", async () => {
    const supabase = createMockSupabase({
      weddingError: { message: "constraint violation" },
    });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ venue: "New Venue" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/internal server error/i);
  });

  it("updates non-date fields without triggering cascade", async () => {
    const supabase = createMockSupabase({
      weddingData: { id: "wedding-1", venue: "Updated Venue" },
    });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ venue: "Updated Venue" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.venue).toBe("Updated Venue");
    // No cascade: _cascaded should be empty
    expect(json._cascaded).toEqual([]);
  });

  it("invalidates the wedding cache after a successful update", async () => {
    const supabase = createMockSupabase({
      weddingData: { id: "wedding-1", venue: "Garden Chapel" },
    });
    mockGetWeddingForUser.mockResolvedValue({
      wedding: mockWedding,
      supabase,
      userId: "user-1",
      role: "owner",
    });

    await PATCH(mockRequest({ venue: "Garden Chapel" }), makeCtx());

    expect(mockInvalidateWeddingCache).toHaveBeenCalledWith("user-1");
  });

  it("includes rehearsal_dinner_date in _cascaded when date changes", async () => {
    // Tasks query needs to handle .not() chain
    const from = vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "wedding-1", date: "2026-07-15" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "rehearsal_dinner") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "date_change_alerts") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    const weddingWithDate = { ...mockWedding, date: "2026-06-01" };
    mockGetWeddingForUser.mockResolvedValue({
      wedding: weddingWithDate,
      supabase: { from },
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ date: "2026-07-15" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json._cascaded).toContain("rehearsal_dinner_date");
  });

  it("shifts system-generated incomplete tasks when date changes", async () => {
    const systemTask = {
      id: "task-sys-1",
      title: "Book Venue",
      due_date: "2026-03-01",
      is_system_generated: true,
      completed: false,
    };

    const taskUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const taskUpdate = vi.fn().mockReturnValue({ eq: taskUpdateEq });

    const from = vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "wedding-1", date: "2026-07-15" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "rehearsal_dinner") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [systemTask], error: null }),
              }),
            }),
          }),
          update: taskUpdate,
        };
      }
      if (table === "date_change_alerts") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    mockGetWeddingForUser.mockResolvedValue({
      wedding: { ...mockWedding, date: "2026-06-01" },
      supabase: { from },
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ date: "2026-07-15" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(200);
    // The cascade result records how many system tasks were shifted
    const shifted = json._cascaded.find((r: string) => r.startsWith("tasks_shifted_"));
    expect(shifted).toBeDefined();
    // task update was called for the shifted task
    expect(taskUpdate).toHaveBeenCalled();
  });

  it("flags user-created tasks for review when date changes", async () => {
    const userTask = {
      id: "task-user-1",
      title: "Bridal shower",
      due_date: "2026-04-15",
      is_system_generated: false,
      completed: false,
    };

    const from = vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "wedding-1", date: "2026-07-15" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "rehearsal_dinner") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [userTask], error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "date_change_alerts") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    mockGetWeddingForUser.mockResolvedValue({
      wedding: { ...mockWedding, date: "2026-06-01" },
      supabase: { from },
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ date: "2026-07-15" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(200);
    const needsReview = json._cascaded.find((r: string) =>
      r.startsWith("tasks_need_review_")
    );
    expect(needsReview).toBeDefined();
    expect(json._tasks_needing_review).toBeDefined();
    expect(json._tasks_needing_review[0].title).toBe("Bridal shower");
  });

  it("syncs ceremony_time to day_of_plans when ceremony_time changes", async () => {
    const dayOfUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const from = vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "wedding-1", ceremony_time: "15:00" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "day_of_plans") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "dop-1", content: { ceremonyTime: "16:00" } },
                error: null,
              }),
            }),
          }),
          update: dayOfUpdate,
        };
      }
      if (table === "date_change_alerts") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    mockGetWeddingForUser.mockResolvedValue({
      wedding: { ...mockWedding, ceremony_time: "16:00" },
      supabase: { from },
      userId: "user-1",
      role: "owner",
    });

    const res = await PATCH(mockRequest({ ceremony_time: "15:00" }), makeCtx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json._cascaded).toContain("day_of_ceremony_time");
    expect(dayOfUpdate).toHaveBeenCalled();
  });

  it("rehearsal dinner date is day before new wedding date", async () => {
    let capturedRehearsalDate: string | undefined;

    const from = vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "wedding-1", date: "2026-08-22" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "rehearsal_dinner") {
        return {
          update: vi.fn().mockImplementation((payload: { date: string }) => {
            capturedRehearsalDate = payload.date;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "date_change_alerts") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    mockGetWeddingForUser.mockResolvedValue({
      wedding: { ...mockWedding, date: "2026-06-01" },
      supabase: { from },
      userId: "user-1",
      role: "owner",
    });

    await PATCH(mockRequest({ date: "2026-08-22" }), makeCtx());

    expect(capturedRehearsalDate).toBe("2026-08-21");
  });
});
