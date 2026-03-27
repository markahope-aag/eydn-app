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

function chain(result: unknown = { data: null, error: null }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "single", "order", "limit"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.single = vi.fn().mockResolvedValue(result);
  return obj;
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/day-of", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function badJsonRequest(): Request {
  return new Request("http://localhost/api/day-of", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "NOT JSON",
  });
}

describe("GET /api/day-of", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing plan", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    const planData = { wedding_id: "wedding_1", content: { timeline: [] } };
    mockFrom.mockReturnValue(chain({ data: planData }));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(planData);
  });

  it("auto-generates plan when none exists", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    // day_of_plans single → null (no existing plan)
    const dayOfChain = chain({ data: null });
    // vendors select
    const vendorsChain = chain();
    (vendorsChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({
      data: [
        { name: "Photo Co", category: "Photographer", poc_name: "Jane", poc_phone: "555-1234" },
      ],
    });
    // wedding_party select
    const partyChain = chain();
    (partyChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({
      data: [
        { name: "Alice", role: "Bridesmaid", job_assignment: "Hold bouquet", phone: "555-5678" },
      ],
    });
    // day_of_plans upsert (save generated plan)
    const upsertChain = chain();
    const generatedPlan = {
      content: {
        timeline: expect.any(Array),
        vendorContacts: expect.any(Array),
        partyAssignments: expect.any(Array),
        packingChecklist: expect.any(Array),
      },
    };
    (upsertChain as Record<string, unknown>).single = vi.fn().mockResolvedValue({ data: generatedPlan });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return dayOfChain;    // day_of_plans select (no existing)
      if (callIndex === 2) return vendorsChain;   // vendors select
      if (callIndex === 3) return partyChain;     // wedding_party select
      if (callIndex === 4) return upsertChain;    // day_of_plans upsert
      return chain({ data: null });
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.content).toBeDefined();
  });

  it("auto-generated plan includes vendor contacts", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const dayOfChain = chain({ data: null });
    const vendorsChain = chain();
    (vendorsChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({
      data: [
        { name: "DJ Mike", category: "DJ or Band", poc_name: "Mike", poc_phone: "555-0000" },
      ],
    });
    const partyChain = chain();
    (partyChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ data: [] });

    // For the upsert, capture what was saved
    let savedContent: Record<string, unknown> | null = null;
    const upsertChain = chain();
    (upsertChain as Record<string, unknown>).upsert = vi.fn().mockImplementation((data: Record<string, unknown>) => {
      savedContent = data.content as Record<string, unknown>;
      return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { content: savedContent } }) }) };
    });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return dayOfChain;
      if (callIndex === 2) return vendorsChain;
      if (callIndex === 3) return partyChain;
      if (callIndex === 4) return upsertChain;
      return chain({ data: null });
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    const contacts = json.content?.vendorContacts || (savedContent as Record<string, unknown> | null)?.vendorContacts;
    expect(contacts).toBeDefined();
    if (contacts) {
      expect(contacts).toHaveLength(1);
      expect(contacts[0].vendor).toBe("DJ Mike");
      expect(contacts[0].contact).toBe("Mike");
    }
  });

  it("auto-generated plan includes 18 timeline events", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const dayOfChain = chain({ data: null });
    const vendorsChain = chain();
    (vendorsChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ data: [] });
    const partyChain = chain();
    (partyChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ data: [] });

    let savedContent: Record<string, unknown> | null = null;
    const upsertChain = chain();
    (upsertChain as Record<string, unknown>).upsert = vi.fn().mockImplementation((data: Record<string, unknown>) => {
      savedContent = data.content as Record<string, unknown>;
      return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { content: savedContent } }) }) };
    });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return dayOfChain;
      if (callIndex === 2) return vendorsChain;
      if (callIndex === 3) return partyChain;
      if (callIndex === 4) return upsertChain;
      return chain({ data: null });
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    const timeline = json.content?.timeline || (savedContent as Record<string, unknown> | null)?.timeline;
    expect(timeline).toBeDefined();
    if (timeline) {
      expect((timeline as unknown[]).length).toBe(18);
    }
  });

  it("auto-generated plan includes packing checklist", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const dayOfChain = chain({ data: null });
    const vendorsChain = chain();
    (vendorsChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ data: [] });
    const partyChain = chain();
    (partyChain as Record<string, unknown>).eq = vi.fn().mockResolvedValue({ data: [] });


    let savedContent: Record<string, unknown> | null = null;
    const upsertChain = chain();
    (upsertChain as Record<string, unknown>).upsert = vi.fn().mockImplementation((data: Record<string, unknown>) => {
      savedContent = data.content as Record<string, unknown>;
      return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { content: savedContent } }) }) };
    });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return dayOfChain;
      if (callIndex === 2) return vendorsChain;
      if (callIndex === 3) return partyChain;
      if (callIndex === 4) return upsertChain;
      return chain({ data: null });
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    const checklist = json.content?.packingChecklist || (savedContent as Record<string, unknown> | null)?.packingChecklist;
    expect(checklist).toBeDefined();
    if (checklist) {
      expect((checklist as unknown[]).length).toBeGreaterThan(10);
    }
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/day-of", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves plan content", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());
    const savedData = { wedding_id: "wedding_1", content: { timeline: [{ time: "4:00 PM", event: "Ceremony" }] } };
    mockFrom.mockReturnValue(chain({ data: savedData, error: null }));

    const res = await PUT(jsonRequest({ content: { timeline: [{ time: "4:00 PM", event: "Ceremony" }] } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(savedData);
  });

  it("returns 400 when content missing", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await PUT(jsonRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("content");
  });

  it("returns 400 with malformed JSON", async () => {
    mockGetWeddingForUser.mockResolvedValue(authSuccess());

    const res = await PUT(badJsonRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });
});
