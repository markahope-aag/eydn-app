/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- Mocks ---

vi.mock("@/lib/auth", () => ({
  getWeddingForUser: vi.fn(),
}));

import { getWeddingForUser } from "@/lib/auth";
import { POST } from "./route";

// --- Helpers ---

const mockWedding = { id: "wedding-1", user_id: "user-1" };

function createMockSupabase(overrides: {
  insertError?: { message: string } | null;
} = {}) {
  const { insertError = null } = overrides;

  return {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: insertError })),
    })),
  };
}

function mockAuthSuccess(supabaseOverrides?: Parameters<typeof createMockSupabase>[0]) {
  const mockSupabase = createMockSupabase(supabaseOverrides);
  vi.mocked(getWeddingForUser).mockResolvedValue({
    wedding: mockWedding as any,
    supabase: mockSupabase as any,
    userId: "user-1",
    role: "owner",
  });
  return mockSupabase;
}

/**
 * Build a Request whose formData() returns a proper File with readable text().
 * jsdom's Request+FormData roundtrip loses File content, so we mock formData().
 */
function csvRequest(csvContent: string): Request {
  const file = new File([csvContent], "guests.csv", { type: "text/csv" });
  const fd = new FormData();
  fd.append("file", file);

  const request = new Request("http://localhost/api/guests/import", { method: "POST" });
  // Override formData to return a FormData with a real, readable File
  vi.spyOn(request, "formData").mockResolvedValue(fd);
  return request;
}

function emptyFormRequest(): Request {
  const fd = new FormData();
  const request = new Request("http://localhost/api/guests/import", { method: "POST" });
  vi.spyOn(request, "formData").mockResolvedValue(fd);
  return request;
}

// --- Tests ---

describe("POST /api/guests/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when not authenticated", async () => {
    vi.mocked(getWeddingForUser).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(csvRequest("name\nAlice"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    mockAuthSuccess();
    const response = await POST(emptyFormRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/no file/i);
  });

  it("returns 400 for empty CSV (header only, no data rows)", async () => {
    mockAuthSuccess();
    const response = await POST(csvRequest("name,email"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/header row and at least one data row/i);
  });

  it("returns 400 when name column is missing", async () => {
    mockAuthSuccess();
    const csv = "email,group\nalice@example.com,Family";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/name.*column/i);
  });

  it("imports normal CSV with name, email, group columns", async () => {
    const mockSupabase = mockAuthSuccess();
    const csv = "name,email,group\nAlice,alice@example.com,Family\nBob,bob@test.com,Friends";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(2);
    expect(mockSupabase.from).toHaveBeenCalledWith("guests");
  });

  it("handles CSV with quoted fields containing commas", async () => {
    mockAuthSuccess();
    const csv = 'name,email,group\n"Smith, John",john@example.com,Family\n"Doe, Jane",jane@test.com,Friends';
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(2);
  });

  it("strips formula injection prefixes (=, +, -, @)", async () => {
    mockAuthSuccess();
    const csv = "name,email\n=CMD('calc'),+hack@evil.com\n-malicious,@injection";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(2);
  });

  it("supports group_name as alternate header for group", async () => {
    mockAuthSuccess();
    const csv = "name,email,group_name\nAlice,alice@example.com,VIP";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(1);
  });

  it("skips rows where name is empty", async () => {
    mockAuthSuccess();
    const csv = "name,email\nAlice,alice@example.com\n,empty@test.com\nBob,bob@test.com";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(2);
  });

  it("returns 400 when all data rows have empty names", async () => {
    mockAuthSuccess();
    const csv = "name,email\n,alice@example.com\n,bob@test.com";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/no valid guests/i);
  });

  it("returns 500 when supabase insert fails", async () => {
    mockAuthSuccess({ insertError: { message: "DB error" } });
    const csv = "name,email\nAlice,alice@example.com";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/failed to import/i);
  });

  it("handles CSV with only name column", async () => {
    mockAuthSuccess();
    const csv = "name\nAlice\nBob\nCharlie";
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(3);
  });

  it("handles quoted fields with escaped quotes (double-quote)", async () => {
    mockAuthSuccess();
    const csv = 'name,email\n"She said ""hello""",test@example.com';
    const response = await POST(csvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.imported).toBe(1);
  });
});
