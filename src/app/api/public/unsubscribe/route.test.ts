import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockLookup = vi.fn();
const updateCalls: Array<{ values: Record<string, unknown>; token: string | null }> = [];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockLookup,
        })),
      })),
      update: vi.fn((values: Record<string, unknown>) => {
        const entry = { values, token: null as string | null };
        updateCalls.push(entry);
        return {
          eq: vi.fn((_col: string, val: string) => {
            entry.token = val;
            return Promise.resolve({ error: null });
          }),
        };
      }),
    })),
  }),
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

function getReq(query: string): Request {
  return new Request(`http://localhost/api/public/unsubscribe${query}`, { method: "GET" });
}

function postReq(token: string | null, type?: string): Request {
  const body = new URLSearchParams();
  if (token !== null) body.set("token", token);
  if (type) body.set("type", type);
  return new Request("http://localhost/api/public/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockLookup.mockResolvedValue({
    data: {
      wedding_id: "wed_1",
      unsubscribed_all: false,
      marketing_emails: true,
      deadline_reminders: true,
      lifecycle_emails: true,
    },
  });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/public/unsubscribe", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true });
    const res = await GET(getReq("?token=abc123"));
    expect(res.status).toBe(429);
  });

  it("renders invalid link when token is missing", async () => {
    const res = await GET(getReq(""));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Invalid Link");
  });

  it("renders invalid link when token has non-hex characters", async () => {
    const res = await GET(getReq("?token=BAD-TOKEN"));
    const text = await res.text();
    expect(text).toContain("Invalid Link");
  });

  it("renders invalid link when token does not match any row", async () => {
    mockLookup.mockResolvedValue({ data: null });
    const res = await GET(getReq("?token=abc123"));
    const text = await res.text();
    expect(text).toContain("Invalid Link");
  });

  it("renders already-unsubscribed when the row is already opted out", async () => {
    mockLookup.mockResolvedValue({
      data: { unsubscribed_all: true },
    });
    const res = await GET(getReq("?token=abc123"));
    const text = await res.text();
    expect(text).toContain("Already Unsubscribed");
  });

  it("renders the confirmation form for a valid token", async () => {
    const res = await GET(getReq("?token=abc123&type=marketing"));
    const text = await res.text();
    expect(text).toContain("marketing emails");
    expect(text).toContain('action="/api/public/unsubscribe"');
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/public/unsubscribe", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true });
    const res = await POST(postReq("abc123"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(postReq(null));
    expect(res.status).toBe(400);
  });

  it("returns 404 when token does not match", async () => {
    mockLookup.mockResolvedValue({ data: null });
    const res = await POST(postReq("abc123"));
    expect(res.status).toBe(404);
  });

  it("unsubscribes from all by default", async () => {
    const res = await POST(postReq("abc123"));
    expect(res.status).toBe(200);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].values).toMatchObject({
      unsubscribed_all: true,
      marketing_emails: false,
      deadline_reminders: false,
      lifecycle_emails: false,
    });
    expect(updateCalls[0].token).toBe("abc123");
  });

  it("only toggles marketing_emails when type=marketing", async () => {
    mockLookup.mockResolvedValue({ data: { id: "pref_1" } });
    const res = await POST(postReq("abc123", "marketing"));
    expect(res.status).toBe(200);
    expect(updateCalls[0].values).toMatchObject({ marketing_emails: false });
    expect(updateCalls[0].values).not.toHaveProperty("unsubscribed_all");
  });

  it("only toggles deadline_reminders when type=deadlines", async () => {
    mockLookup.mockResolvedValue({ data: { id: "pref_1" } });
    const res = await POST(postReq("abc123", "deadlines"));
    expect(res.status).toBe(200);
    expect(updateCalls[0].values).toMatchObject({ deadline_reminders: false });
  });

  it("only toggles lifecycle_emails when type=lifecycle", async () => {
    mockLookup.mockResolvedValue({ data: { id: "pref_1" } });
    const res = await POST(postReq("abc123", "lifecycle"));
    expect(res.status).toBe(200);
    expect(updateCalls[0].values).toMatchObject({ lifecycle_emails: false });
  });
});
