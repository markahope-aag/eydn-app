 
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

import { GET, PATCH } from "./route";

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
const mockWedding = {
  id: "wedding_1",
  website_slug: "alice-and-bob",
  website_headline: "We're getting married!",
  website_story: "Our story...",
  website_schedule: null,
  website_travel_info: null,
  website_accommodations: null,
  website_faq: null,
  website_cover_url: null,
  website_couple_photo_url: null,
  website_enabled: true,
};

function authSuccess() {
  return { wedding: mockWedding, supabase: mockSupabase, userId: "user_1", role: "owner" };
}

function chain(result: unknown = { data: null, error: null }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "single", "order", "limit", "maybeSingle"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.maybeSingle = vi.fn().mockResolvedValue(result);
  return obj;
}

function updateChain(result: unknown = { error: null }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "single", "order", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  // Terminal .eq() resolves
  obj.eq = vi.fn().mockResolvedValue(result);
  return obj;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/wedding-website", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function badJsonRequest(): Request {
  return new Request("http://localhost/api/wedding-website", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "NOT JSON",
  });
}

describe("GET /api/wedding-website", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns website settings", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slug).toBe("alice-and-bob");
    expect(json.headline).toBe("We're getting married!");
    expect(json.enabled).toBe(true);
  });
});

describe("PATCH /api/wedding-website", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves settings", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    // No slug change, so no uniqueness check — just the update call
    mockFrom.mockReturnValue(updateChain({ error: null }));

    const res = await PATCH(jsonRequest({ headline: "New headline" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("checks slug uniqueness and returns 409 for taken slug", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    // Slug uniqueness check finds an existing wedding
    mockFrom.mockReturnValue(chain({ data: { id: "other_wedding" } }));

    const res = await PATCH(jsonRequest({ slug: "taken-slug" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("already taken");
  });

  it("returns 400 with malformed JSON", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await PATCH(badJsonRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });
});
