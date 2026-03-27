/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- Mocks ---

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function createMockSupabase(overrides: {
  selectData?: unknown[];
  selectError?: { message: string } | null;
  insertData?: unknown;
  insertError?: { message: string } | null;
} = {}) {
  const {
    selectData = [],
    selectError = null,
    insertData = { id: "guest-1", name: "Test Guest" },
    insertError = null,
  } = overrides;

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => ({ data: selectData, error: selectError })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: insertData, error: insertError })),
        })),
      })),
    })),
  };
}

let mockSupabase = createMockSupabase();

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: vi.fn(() => ({
    wedding: mockWedding,
    supabase: mockSupabase,
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

import { getWeddingForUser } from "@/lib/auth";
import { GET, POST } from "./route";

// --- Helpers ---

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockBadJsonRequest(): Request {
  return new Request("http://localhost/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  });
}

// --- Tests ---

describe("GET /api/guests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });
  });

  it("returns guest list", async () => {
    const guests = [
      { id: "g1", name: "Alice" },
      { id: "g2", name: "Bob" },
    ];
    mockSupabase = createMockSupabase({ selectData: guests });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual(guests);
    expect(response.status).toBe(200);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });
});

describe("POST /api/guests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });
  });

  it("creates a guest with valid data", async () => {
    const guestData = { id: "guest-1", name: "Jane Doe" };
    mockSupabase = createMockSupabase({ insertData: guestData });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const response = await POST(mockRequest({ name: "Jane Doe" }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(guestData);
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(mockRequest({ email: "test@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("name");
    expect(data.error).toContain("required");
  });

  it("returns 400 with malformed JSON", async () => {
    const response = await POST(mockBadJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid json/i);
  });

  it("validates email format when provided", async () => {
    const response = await POST(mockRequest({ name: "Jane", email: "not-an-email" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/email/i);
  });

  it("accepts valid email", async () => {
    const guestData = { id: "guest-1", name: "Jane", email: "jane@example.com" };
    mockSupabase = createMockSupabase({ insertData: guestData });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding as any,
      supabase: mockSupabase as any,
      userId: "user-1",
      role: "owner",
    });

    const response = await POST(mockRequest({ name: "Jane", email: "jane@example.com" }));

    expect(response.status).toBe(201);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(mockRequest({ name: "Jane" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });
});
