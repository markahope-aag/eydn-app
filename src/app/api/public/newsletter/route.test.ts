import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockExistingLookup = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockExistingLookup,
        })),
      })),
      insert: (...args: unknown[]) => mockInsert(...args),
    })),
  }),
}));

const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/email-newsletter", () => ({
  getNewsletterWelcomeEmail: () => ({ subject: "Welcome", html: "<p>hi</p>" }),
}));

const mockCadence = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cadence", () => ({
  cadenceSubscribe: (...args: unknown[]) => mockCadence(...args),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false });
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

import { POST } from "./route";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/public/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockExistingLookup.mockResolvedValue({ data: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe("POST /api/public/newsletter", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true });
    const res = await POST(jsonReq({ email: "a@b.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when the email is missing", async () => {
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the email is invalid", async () => {
    const res = await POST(jsonReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("inserts and fires welcome email + cadence for a fresh subscriber", async () => {
    const res = await POST(jsonReq({ email: "Alice@Example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Email was lowercased before insert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com", source: "newsletter" })
    );

    // Fire-and-forget needs a tick to flush
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendEmail).toHaveBeenCalled();
    expect(mockCadence).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" })
    );
  });

  it("does not re-send the welcome email when the user already exists", async () => {
    mockExistingLookup.mockResolvedValue({ data: { id: "w1" } });
    const res = await POST(jsonReq({ email: "alice@example.com" }));
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendEmail).not.toHaveBeenCalled();
    // But cadence still re-syncs
    expect(mockCadence).toHaveBeenCalled();
  });

  it("treats duplicate-key insert errors as success", async () => {
    mockInsert.mockResolvedValue({ error: { message: "duplicate key violates unique" } });
    const res = await POST(jsonReq({ email: "alice@example.com" }));
    expect(res.status).toBe(200);
  });

  it("returns 500 for non-duplicate insert errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(jsonReq({ email: "alice@example.com" }));
    expect(res.status).toBe(500);
  });
});
