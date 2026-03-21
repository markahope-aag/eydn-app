 
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

import { GET, PATCH } from "./route";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
const mockWedding = { id: "wedding_1" };

function authSuccess() {
  return { wedding: mockWedding, supabase: mockSupabase, userId: "user_1", role: "owner" };
}

function chain(result: unknown = { data: null, error: null }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "single", "order", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  // For GET which uses .limit() as terminal (not .single())
  obj.limit = vi.fn().mockResolvedValue(result);
  return obj;
}

function updateChain(result: unknown = { error: null }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "neq", "single", "order", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  // .eq() is called twice in chain: .eq("id", ...).eq("wedding_id", ...)
  // First call returns self (chainable), second call resolves
  let eqCallCount = 0;
  obj.eq = vi.fn().mockImplementation(() => {
    eqCallCount++;
    if (eqCallCount >= 2) return Promise.resolve(result);
    return obj;
  });
  return obj;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function badJsonRequest(): Request {
  return new Request("http://localhost/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "NOT JSON",
  });
}

describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns notifications", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    const notifications = [
      { id: "n1", message: "Task due soon", read: false },
      { id: "n2", message: "New RSVP", read: true },
    ];
    mockFrom.mockReturnValue(chain({ data: notifications, error: null }));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(notifications);
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates notification", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    mockFrom.mockReturnValue(updateChain({ error: null }));

    const res = await PATCH(jsonRequest({ id: "n1", read: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 with malformed JSON", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await PATCH(badJsonRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });
});
