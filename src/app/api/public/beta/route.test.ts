import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockCountResult = vi.fn();
const mockExistingLookup = vi.fn();
const mockInsert = vi.fn();
const mockUpdateChain = {
  eq: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn((_cols: string, opts?: { count?: string }) => {
        if (opts?.count === "exact") {
          return {
            eq: vi.fn(() => mockCountResult()),
          };
        }
        return {
          eq: vi.fn(() => ({
            single: mockExistingLookup,
          })),
        };
      }),
      insert: (...args: unknown[]) => mockInsert(...args),
      update: vi.fn(() => mockUpdateChain),
    })),
  }),
}));

const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false });
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

import { GET, POST } from "./route";

function getReq(): Request {
  return new Request("http://localhost/api/public/beta", { method: "GET" });
}

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/public/beta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockCountResult.mockResolvedValue({ count: 10 });
  mockExistingLookup.mockResolvedValue({ data: null });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdateChain.eq.mockResolvedValue({ error: null });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/public/beta", () => {
  it("reports availability when slots remain", async () => {
    mockCountResult.mockResolvedValue({ count: 10 });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      beta_available: true,
      slots_remaining: 40,
      total_slots: 50,
      slots_taken: 10,
    });
  });

  it("reports no availability when slots are full", async () => {
    mockCountResult.mockResolvedValue({ count: 50 });
    const res = await GET(getReq());
    const body = await res.json();
    expect(body.beta_available).toBe(false);
    expect(body.slots_remaining).toBe(0);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, retryAfter: 30 });
    const res = await GET(getReq());
    expect(res.status).toBe(429);
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/public/beta", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true });
    const res = await POST(postReq({ name: "Alice", email: "a@b.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(postReq({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(postReq({ name: "Alice", email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns success when user is already on the waitlist", async () => {
    mockExistingLookup.mockResolvedValue({ data: { id: "w1" } });
    const res = await POST(postReq({ name: "Alice", email: "a@b.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts and sends the welcome email on success", async () => {
    const res = await POST(postReq({ name: "Alice Liddell", email: "Alice@Example.com" }));
    expect(res.status).toBe(200);

    // Email lowercased
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com", name: "Alice Liddell", source: "beta" })
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "alice@example.com" })
    );
  });

  it("still succeeds when the welcome email fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendEmail.mockRejectedValue(new Error("resend down"));
    const res = await POST(postReq({ name: "Alice", email: "a@b.com" }));
    expect(res.status).toBe(200);
  });

  it("treats duplicate insert errors as success", async () => {
    mockInsert.mockResolvedValue({ error: { message: "duplicate key violates unique" } });
    const res = await POST(postReq({ name: "Alice", email: "a@b.com" }));
    expect(res.status).toBe(200);
  });

  it("returns 500 for non-duplicate insert errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(postReq({ name: "Alice", email: "a@b.com" }));
    expect(res.status).toBe(500);
  });
});
