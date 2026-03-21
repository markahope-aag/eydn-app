 
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

import { GET, PUT } from "./route";
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
  return new Request("http://localhost/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns settings", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    const settingsData = { email_reminders: true, reminder_days_before: 7 };
    mockFrom.mockReturnValue(chain({ data: settingsData }));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(settingsData);
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves settings", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    mockFrom.mockReturnValue(chain({ data: null, error: null }));

    const res = await PUT(jsonRequest({ email_reminders: false, reminder_days_before: 14 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("validates reminder_days_before is a number", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await PUT(jsonRequest({ reminder_days_before: "not-a-number" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("reminder_days_before");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue(authFailure());

    const res = await PUT(jsonRequest({ email_reminders: true }));
    expect(res.status).toBe(401);
  });
});
