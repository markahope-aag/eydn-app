 
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

import { GET, PATCH } from "./route";
import { NextResponse } from "next/server";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
const mockWedding = { id: "wedding_1" };

function authSuccess() {
  return { wedding: mockWedding, supabase: mockSupabase, userId: "user_1", role: "owner" };
}

function authFailure() {
  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

function chain(result: unknown = { data: null, error: null }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "single", "order", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.single = vi.fn().mockResolvedValue(result);
  return obj;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/questionnaire", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/questionnaire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns questionnaire data", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    const qData = { wedding_id: "wedding_1", responses: { style: "modern" }, completed: true };
    mockFrom.mockReturnValue(chain({ data: qData }));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(qData);
  });
});

describe("PATCH /api/questionnaire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves responses", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    const savedData = { wedding_id: "wedding_1", responses: { style: "rustic" }, completed: false };
    mockFrom.mockReturnValue(chain({ data: savedData, error: null }));

    const res = await PATCH(jsonRequest({ responses: { style: "rustic" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(savedData);
  });

  it("returns 400 when responses missing", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await PATCH(jsonRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("responses");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue(authFailure());

    const res = await PATCH(jsonRequest({ responses: { style: "modern" } }));
    expect(res.status).toBe(401);
  });
});
