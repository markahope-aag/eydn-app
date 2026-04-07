import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mock Supabase admin ---

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({ from: mockFrom }),
}));

// Mock crypto for deterministic short codes
vi.mock("crypto", () => ({
  default: {
    randomBytes: () => ({
      toString: () => "abc1234xyz",
    }),
  },
}));

import { NextRequest } from "next/server";
import { POST, GET } from "./route";

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/tools/calculator-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockGetRequest(code?: string): NextRequest {
  const url = code
    ? `http://localhost/api/tools/calculator-save?code=${code}`
    : "http://localhost/api/tools/calculator-save";
  return new NextRequest(url);
}

describe("POST /api/tools/calculator-save", () => {
  beforeEach(() => {
    vi.clearAllMocks();

  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(mockPostRequest({ budget: 10000, guests: 100, state: "NY", month: 6 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when email has no @", async () => {
    const res = await POST(mockPostRequest({ email: "invalid", budget: 10000, guests: 100, state: "NY", month: 6 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when calculator fields are missing", async () => {
    const res = await POST(mockPostRequest({ email: "test@example.com" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when budget is missing but others present", async () => {
    const res = await POST(mockPostRequest({
      email: "test@example.com",
      guests: 100,
      state: "NY",
      month: 6,
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/required/i);
  });

  it("updates existing save when email already exists", async () => {
    const existing = { id: "save-1", short_code: "abc1234" };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await POST(mockPostRequest({
      name: "Alice",
      email: "alice@example.com",
      budget: 20000,
      guests: 150,
      state: "CA",
      month: 9,
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.short_code).toBe("abc1234");
  });

  it("creates new save when email does not exist", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const res = await POST(mockPostRequest({
      name: "Bob",
      email: "bob@example.com",
      budget: 15000,
      guests: 80,
      state: "TX",
      month: 3,
    }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.short_code).toBeDefined();
    expect(typeof json.short_code).toBe("string");
  });

  it("returns 500 when insert fails", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });

    const res = await POST(mockPostRequest({
      email: "fail@example.com",
      budget: 10000,
      guests: 50,
      state: "FL",
      month: 12,
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatch(/try again/i);
  });

  it("trims email and lowercases it", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: insertSpy,
    });

    await POST(mockPostRequest({
      email: "  Alice@Example.COM  ",
      budget: 10000,
      guests: 50,
      state: "FL",
      month: 12,
    }));

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" }),
    );
  });
});

describe("GET /api/tools/calculator-save", () => {
  beforeEach(() => {
    vi.clearAllMocks();

  });

  it("returns 400 when code parameter is missing", async () => {
    const res = await GET(mockGetRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing code/i);
  });

  it("returns 404 when code not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const res = await GET(mockGetRequest("nonexistent"));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/i);
  });

  it("returns saved calculator data when code is valid", async () => {
    const savedData = { name: "Alice", budget: 20000, guests: 150, state: "CA", month: 9 };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: savedData, error: null }),
        }),
      }),
    });

    const res = await GET(mockGetRequest("abc1234"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(savedData);
  });
});
