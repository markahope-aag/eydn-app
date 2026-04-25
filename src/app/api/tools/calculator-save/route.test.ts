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

// Cadence sync runs fire-and-forget after the response — stub it out so the
// background promise doesn't try to .update() on the per-test supabase mocks
// (which only declare the chains the foreground response actually exercises).
vi.mock("@/lib/cadence", () => ({
  cadenceSubscribe: vi.fn().mockResolvedValue({ status: "skipped", reason: "test" }),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

function mockPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/tools/calculator-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "save-new" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
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
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        }),
      }),
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
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "save-new" }, error: null }),
      }),
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: insertSpy,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
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

// GET handler was removed — see route.ts for rationale.
// The share link is served by the server component at
// /tools/wedding-budget-calculator/s/[code]/page.tsx which doesn't
// return the email field and is rate-limited via proxy.ts.
