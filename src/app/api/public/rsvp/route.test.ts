import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockTokenLookup = vi.fn();
const mockGuestUpdate = vi.fn();
const mockTokenUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "rsvp_tokens") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockTokenLookup,
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => mockTokenUpdate()),
          })),
        };
      }
      // guests
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => mockGuestUpdate()),
        })),
      };
    }),
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

import { POST } from "./route";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/public/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockTokenLookup.mockResolvedValue({
    data: { id: "tok_1", guest_id: "g1" },
    error: null,
  });
  mockGuestUpdate.mockResolvedValue({ error: null });
  mockTokenUpdate.mockResolvedValue({ error: null });
});

describe("POST /api/public/rsvp", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, retryAfter: 30 });
    const res = await POST(jsonReq({ token: "t", rsvp_status: "accepted" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(jsonReq({ rsvp_status: "accepted" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rsvp_status is missing", async () => {
    const res = await POST(jsonReq({ token: "t" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rsvp_status is invalid", async () => {
    const res = await POST(jsonReq({ token: "t", rsvp_status: "maybe_nope" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when meal_preference exceeds 200 characters", async () => {
    const res = await POST(
      jsonReq({
        token: "t",
        rsvp_status: "accepted",
        meal_preference: "x".repeat(201),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when plus_one_name exceeds 200 characters", async () => {
    const res = await POST(
      jsonReq({
        token: "t",
        rsvp_status: "accepted",
        plus_one_name: "x".repeat(201),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when token does not exist", async () => {
    mockTokenLookup.mockResolvedValue({ data: null, error: null });
    const res = await POST(jsonReq({ token: "ghost", rsvp_status: "accepted" }));
    expect(res.status).toBe(404);
  });

  it("returns 500 when guest update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGuestUpdate.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(jsonReq({ token: "t", rsvp_status: "accepted" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when token update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockTokenUpdate.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(jsonReq({ token: "t", rsvp_status: "accepted" }));
    expect(res.status).toBe(500);
  });

  it("saves the RSVP and marks the token responded on success", async () => {
    const res = await POST(
      jsonReq({
        token: "t",
        rsvp_status: "accepted",
        meal_preference: "vegan",
        plus_one_name: "Jordan",
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockGuestUpdate).toHaveBeenCalled();
    expect(mockTokenUpdate).toHaveBeenCalled();
  });
});
