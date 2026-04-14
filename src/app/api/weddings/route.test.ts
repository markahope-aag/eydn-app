import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetWeddingForUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getWeddingForUser: () => mockGetWeddingForUser(),
}));

const mockInsertSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsertSingle,
        })),
      })),
    })),
  }),
}));

const mockCapture = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analytics-server", () => ({
  captureServer: (...args: unknown[]) => mockCapture(...args),
}));

import { GET, POST } from "./route";

function postReq(body: unknown, referer?: string): Request {
  return new Request("http://localhost/api/weddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(referer ? { referer } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user_123" });
  mockGetWeddingForUser.mockResolvedValue({
    wedding: { id: "wed_1", partner1_name: "Alice", partner2_name: "Bob" },
  });
  mockInsertSingle.mockResolvedValue({
    data: { id: "wed_1", partner1_name: "Alice", partner2_name: "Bob" },
    error: null,
  });
});

// ─── GET ──────────────────────────────────────────────────────────

describe("GET /api/weddings", () => {
  it("forwards auth errors", async () => {
    mockGetWeddingForUser.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the wedding", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "wed_1" });
  });
});

// ─── POST ─────────────────────────────────────────────────────────

describe("POST /api/weddings", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(postReq({ partner1_name: "A", partner2_name: "B" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when partner1_name is missing", async () => {
    const res = await POST(postReq({ partner2_name: "B" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when partner2_name is missing", async () => {
    const res = await POST(postReq({ partner1_name: "A" }));
    expect(res.status).toBe(400);
  });

  it("creates the wedding and captures a signup event", async () => {
    const res = await POST(
      postReq({ partner1_name: "Alice", partner2_name: "Bob", date: "2026-07-31", budget: 25000 })
    );
    expect(res.status).toBe(201);
    expect(mockInsertSingle).toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith(
      "user_123",
      "trial_signup",
      expect.objectContaining({ wedding_id: "wed_1", source: "weddings_post" })
    );
  });

  it("extracts UTM params from the referer", async () => {
    await POST(
      postReq(
        { partner1_name: "Alice", partner2_name: "Bob" },
        "https://eydn.app/?utm_source=google&utm_medium=cpc&utm_campaign=spring"
      )
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "user_123",
      "trial_signup",
      expect.objectContaining({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "spring",
      })
    );
  });

  it("silently handles a malformed referer", async () => {
    await POST(
      postReq({ partner1_name: "Alice", partner2_name: "Bob" }, "not-a-url")
    );
    // Still captures, just without UTM
    const utmArgs = mockCapture.mock.calls[0][2];
    expect(utmArgs.utm_source).toBeUndefined();
  });
});
