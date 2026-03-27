import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

type AuthResult = Awaited<ReturnType<typeof import("@/lib/auth").getWeddingForUser>>;

// --- Mocks ---

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function createMockSupabase(overrides: {
  selectData?: unknown[];
  selectError?: { message: string } | null;
  insertData?: unknown;
  insertError?: { message: string; code?: string } | null;
} = {}) {
  const {
    selectData = [],
    selectError = null,
    insertData = { id: "collab-1", email: "partner@example.com", role: "partner" },
    insertError = null,
  } = overrides;

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: selectData, error: selectError })),
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
  getWeddingForUser: vi.fn(),
}));

import { getWeddingForUser } from "@/lib/auth";
import { GET, POST } from "./route";

// --- Helpers ---

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/collaborators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthAsOwner() {
  mockSupabase = createMockSupabase();
  vi.mocked(getWeddingForUser).mockResolvedValue({
    wedding: mockWedding,
    supabase: mockSupabase,
    userId: "user-1",
    role: "owner",
  } as unknown as AuthResult);
}

function mockAuthAsNonOwner(role: "partner" | "coordinator" = "partner") {
  mockSupabase = createMockSupabase();
  vi.mocked(getWeddingForUser).mockResolvedValue({
    wedding: mockWedding,
    supabase: mockSupabase,
    userId: "user-2",
    role,
  } as unknown as AuthResult);
}

// --- Tests ---

describe("GET /api/collaborators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAsOwner();
  });

  it("returns collaborator list for owners", async () => {
    const collabs = [
      { id: "c1", email: "partner@example.com", role: "partner" },
    ];
    mockSupabase = createMockSupabase({ selectData: collabs });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(collabs);
  });

  it("returns 403 for non-owners", async () => {
    mockAuthAsNonOwner("partner");

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/owner/i);
  });

  it("returns 403 for coordinators", async () => {
    mockAuthAsNonOwner("coordinator");

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/owner/i);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("POST /api/collaborators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAsOwner();
  });

  it("creates a collaborator with valid data", async () => {
    const collabData = { id: "c1", email: "partner@example.com", role: "partner" };
    mockSupabase = createMockSupabase({ insertData: collabData });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await POST(mockRequest({ email: "partner@example.com", role: "partner" }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(collabData);
  });

  it("returns 403 for non-owners", async () => {
    mockAuthAsNonOwner();

    const response = await POST(mockRequest({ email: "test@example.com", role: "partner" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/owner/i);
  });

  it("returns 400 when email is missing", async () => {
    const response = await POST(mockRequest({ role: "partner" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/email.*role.*required/i);
  });

  it("returns 400 when role is missing", async () => {
    const response = await POST(mockRequest({ email: "test@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/required/i);
  });

  it("validates role is partner or coordinator", async () => {
    const response = await POST(mockRequest({ email: "test@example.com", role: "partner" }));
    expect(response.status).toBe(201);
  });

  it("returns 400 with invalid role", async () => {
    const response = await POST(mockRequest({ email: "test@example.com", role: "admin" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/role/i);
  });

  it("accepts coordinator role", async () => {
    const collabData = { id: "c1", email: "coord@example.com", role: "coordinator" };
    mockSupabase = createMockSupabase({ insertData: collabData });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await POST(mockRequest({ email: "coord@example.com", role: "coordinator" }));
    expect(response.status).toBe(201);
  });

  it("returns 409 when inviting a duplicate email", async () => {
    mockSupabase = createMockSupabase({
      insertError: { message: "duplicate key", code: "23505" },
    });
    vi.mocked(getWeddingForUser).mockResolvedValue({
      wedding: mockWedding,
      supabase: mockSupabase,
      userId: "user-1",
      role: "owner",
    } as unknown as AuthResult);

    const response = await POST(mockRequest({ email: "already@invited.com", role: "partner" }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already.*invited/i);
  });

  it("accepts uppercase email without error", async () => {
    mockAuthAsOwner();

    const response = await POST(mockRequest({ email: "UPPER@CASE.COM", role: "partner" }));

    // Should succeed — email is lowercased internally before insert
    expect(response.status).toBe(201);
  });
});

describe("Collaboration Role Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("partner cannot list collaborators", async () => {
    mockAuthAsNonOwner("partner");
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("coordinator cannot list collaborators", async () => {
    mockAuthAsNonOwner("coordinator");
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("partner cannot invite collaborators", async () => {
    mockAuthAsNonOwner("partner");
    const response = await POST(mockRequest({ email: "new@user.com", role: "partner" }));
    expect(response.status).toBe(403);
  });

  it("coordinator cannot invite collaborators", async () => {
    mockAuthAsNonOwner("coordinator");
    const response = await POST(mockRequest({ email: "new@user.com", role: "coordinator" }));
    expect(response.status).toBe(403);
  });
});
