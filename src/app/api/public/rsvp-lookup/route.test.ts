import { vi, describe, it, expect, beforeEach } from "vitest";

// --- Mock rate limiter ---

const mockCheckRateLimit = vi.fn();
const mockGetClientIP = vi.fn().mockReturnValue("127.0.0.1");

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIP: (...args: unknown[]) => mockGetClientIP(...args),
  RATE_LIMITS: { public: { limit: 10, windowSeconds: 60 } },
}));

// --- Mock API logger ---

vi.mock("@/lib/api-logger", () => ({
  logRequest: vi.fn(),
}));

// --- Mock Supabase ---

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { POST } from "./route";

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/public/rsvp-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/public/rsvp-lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not rate limited
    mockCheckRateLimit.mockResolvedValue({ limited: false });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ limited: true, retryAfter: 30 });

    const res = await POST(mockRequest({ name: "Alice", wedding_slug: "alice-bob" }));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toMatch(/too many requests/i);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(mockRequest({ wedding_slug: "alice-bob" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing required/i);
  });

  it("returns 400 when wedding_slug is missing", async () => {
    const res = await POST(mockRequest({ name: "Alice" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing required/i);
  });

  it("returns 400 when name exceeds 200 characters", async () => {
    const res = await POST(mockRequest({
      name: "A".repeat(201),
      wedding_slug: "alice-bob",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid name/i);
  });

  it("returns 400 when name is not a string", async () => {
    const res = await POST(mockRequest({
      name: 123,
      wedding_slug: "alice-bob",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid name/i);
  });

  it("returns 400 when wedding_slug has invalid format", async () => {
    const res = await POST(mockRequest({
      name: "Alice",
      wedding_slug: "INVALID SLUG!",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid wedding slug/i);
  });

  it("returns 400 when wedding_slug is a single character", async () => {
    const res = await POST(mockRequest({
      name: "Alice",
      wedding_slug: "a",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid wedding slug/i);
  });

  it("returns 404 when wedding not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "weddings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(mockRequest({ name: "Alice", wedding_slug: "nonexistent-wedding" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/wedding not found/i);
  });

  // Helper: name lookup now happens in the DB via .ilike(), so the mock
  // returns either the matched token row or null based on what we want
  // to simulate (rather than returning the full list and matching in JS).
  function setupTokenLookup(match: { token: string; responded: boolean; guest: { id: string; name: string } } | null) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "weddings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "w-1" }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "rsvp_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: match
                      ? { token: match.token, responded: match.responded, guests: match.guest }
                      : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  }

  it("returns 404 when guest name not found", async () => {
    setupTokenLookup(null);

    const res = await POST(mockRequest({ name: "Alice Jones", wedding_slug: "alice-bob" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain("couldn't find");
  });

  it("returns matching guest with token on success", async () => {
    setupTokenLookup({
      token: "tok-1",
      responded: false,
      guest: { id: "g-1", name: "Alice Jones" },
    });

    const res = await POST(mockRequest({ name: "Alice Jones", wedding_slug: "alice-bob" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.token).toBe("tok-1");
    expect(json.guest_id).toBe("g-1");
    expect(json.guest_name).toBe("Alice Jones");
    expect(json.responded).toBe(false);
  });

  it("matches names case-insensitively", async () => {
    // The DB's ilike() handles case-insensitivity — the route now just
    // trims and passes through, so the mock returns the canonical name.
    setupTokenLookup({
      token: "tok-1",
      responded: false,
      guest: { id: "g-1", name: "Alice Jones" },
    });

    const res = await POST(mockRequest({ name: "  ALICE JONES  ", wedding_slug: "alice-bob" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.guest_name).toBe("Alice Jones");
  });

  it("handles null tokens data gracefully", async () => {
    setupTokenLookup(null);

    const res = await POST(mockRequest({ name: "Ghost", wedding_slug: "alice-bob" }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain("couldn't find");
  });
});
