import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// --- Mock Supabase ---

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({ from: mockFrom }),
}));

// --- Mock svix Webhook ---

const { mockVerify } = vi.hoisted(() => {
  const mockVerify = vi.fn();
  return { mockVerify };
});

vi.mock("svix", () => {
  return {
    Webhook: class {
      verify(...args: unknown[]) {
        return mockVerify(...args);
      }
    },
  };
});

import { POST } from "./route";

function mockRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/webhooks/resend", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    // Default: secret set + svix mock auto-accepts so the test body
    // exercises the post-verification logic. Individual tests that
    // need to test the missing-secret or invalid-signature paths
    // override these explicitly.
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test_default";
    mockVerify.mockReturnValue(undefined);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns 503 when RESEND_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const res = await POST(mockRequest({ type: "email.delivered", data: { email_id: "123" } }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toMatch(/not configured/i);
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid JSON after signature verification", async () => {
    const req = new Request("http://localhost/api/webhooks/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when event type is missing", async () => {
    const res = await POST(mockRequest({ data: { email_id: "123" } }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing event data/i);
  });

  it("returns 400 when data is missing", async () => {
    const res = await POST(mockRequest({ type: "email.delivered" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/missing event data/i);
  });

  it("acknowledges unknown event types without storing", async () => {
    const res = await POST(mockRequest({
      type: "email.unknown_event",
      data: { email_id: "123" },
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    // Should not insert for unknown events
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("stores delivered event correctly", async () => {
    const res = await POST(mockRequest({
      type: "email.delivered",
      data: {
        email_id: "em-123",
        to: ["alice@test.com"],
        subject: "Wedding Invitation",
      },
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("email_events");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_id: "em-123",
        email_to: "alice@test.com",
        event_type: "delivered",
      }),
    );
  });

  it("stores opened event correctly", async () => {
    await POST(mockRequest({
      type: "email.opened",
      data: { email_id: "em-456", to: "bob@test.com" },
    }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "opened",
        email_to: "bob@test.com",
      }),
    );
  });

  it("stores clicked event with click URL metadata", async () => {
    await POST(mockRequest({
      type: "email.clicked",
      data: {
        email_id: "em-789",
        to: ["carol@test.com"],
        click: { url: "https://eydn.app/rsvp" },
      },
    }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "clicked",
        metadata: expect.objectContaining({
          click_url: "https://eydn.app/rsvp",
        }),
      }),
    );
  });

  it("stores bounced event with bounce type", async () => {
    await POST(mockRequest({
      type: "email.bounced",
      data: {
        email_id: "em-bounce",
        to: ["bad@test.com"],
        bounce: { type: "hard" },
      },
    }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "bounced",
        metadata: expect.objectContaining({
          bounce_type: "hard",
        }),
      }),
    );
  });

  it("stores complained event", async () => {
    await POST(mockRequest({
      type: "email.complained",
      data: {
        email_id: "em-complaint",
        to: "complainer@test.com",
      },
    }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "complained",
      }),
    );
  });

  it("handles to as string instead of array", async () => {
    await POST(mockRequest({
      type: "email.delivered",
      data: { email_id: "em-str", to: "direct@test.com" },
    }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_to: "direct@test.com",
      }),
    );
  });

  it("falls back to unknown when email_id and to are missing", async () => {
    await POST(mockRequest({
      type: "email.delivered",
      data: {},
    }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_id: "unknown",
        email_to: "unknown",
      }),
    );
  });

  // --- Signature verification tests ---

  it("returns 401 when signature is invalid and secret is configured", async () => {
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test123";
    mockVerify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(mockRequest(
      { type: "email.delivered", data: {} },
      {
        "svix-id": "msg-123",
        "svix-timestamp": "1234567890",
        "svix-signature": "v1,invalid",
      },
    ));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/invalid signature/i);
  });

  it("processes event when signature is valid", async () => {
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test123";
    mockVerify.mockImplementation(() => undefined); // no throw = valid

    const res = await POST(mockRequest(
      { type: "email.delivered", data: { email_id: "em-verified", to: ["v@test.com"] } },
      {
        "svix-id": "msg-123",
        "svix-timestamp": "1234567890",
        "svix-signature": "v1,valid_sig",
      },
    ));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });
});
