import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/validation", () => ({
  escapeHtml: (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"),
}));

vi.mock("@/lib/email-preferences", () => ({
  emailFooterHtml: (token: string, type: string) =>
    `<footer data-token="${token}" data-type="${type}">unsubscribe</footer>`,
}));

// In-memory stand-in for email_send_log + the no-op rows the runner queries.
// Each test resets the array via vi.clearAllMocks + manually below.
const sentLogRows: Array<{ recipient_email: string; category: string; sent_at: string }> = [];
const mockInsert = vi.fn(async (row: { recipient_email: string; category: string }) => {
  sentLogRows.push({ ...row, sent_at: new Date().toISOString() });
  return { error: null };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "email_send_log") {
        throw new Error(`unexpected table in test: ${table}`);
      }
      return {
        // Cap-check: select(...).eq.neq.gte.limit
        select: () => ({
          eq: (_col: string, recipientEmail: string) => ({
            neq: () => ({
              gte: (_c: string, cutoffIso: string) => ({
                limit: async () => {
                  const cutoff = new Date(cutoffIso).getTime();
                  const matches = sentLogRows.filter(
                    (r) =>
                      r.recipient_email === recipientEmail &&
                      r.category !== "transactional" &&
                      new Date(r.sent_at).getTime() >= cutoff
                  );
                  return { data: matches, error: null };
                },
              }),
            }),
          }),
        }),
        insert: (row: { recipient_email: string; category: string }) => mockInsert(row),
      };
    },
  }),
}));

import { sendEmail, getLifecycleEmail, sendCollaboratorInvite } from "./email";

describe("sendEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    sentLogRows.length = 0;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns error when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Email service not configured");
  });

  it("sends email successfully and returns emailId", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Welcome",
      html: "<p>Welcome</p>",
    });

    expect(result.success).toBe(true);
    expect(result.emailId).toBe("email-123");
  });

  it("handles Resend API errors gracefully", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockRejectedValue(new Error("Rate limit exceeded"));

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
  });

  it("handles non-Error thrown values", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockRejectedValue("string error");

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error");
  });

  it("handles null data in response", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockResolvedValue({ data: null, error: null });

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(true);
    expect(result.emailId).toBeUndefined();
  });

  describe("daily-cap behavior", () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = "re_test_key";
      mockSend.mockResolvedValue({ data: { id: "email-id" }, error: null });
    });

    it("skips a non-transactional send when one already happened in the last 24h", async () => {
      // First non-transactional send for this recipient — should go through.
      const first = await sendEmail({
        to: "spammed@example.com",
        category: "lifecycle",
        subject: "First",
        html: "<p>First</p>",
      });
      expect(first.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Second non-transactional send within the 24h window — capped.
      const second = await sendEmail({
        to: "spammed@example.com",
        category: "marketing",
        subject: "Second",
        html: "<p>Second</p>",
      });
      expect(second.success).toBe(false);
      expect(second.skipped).toBe("daily_cap");
      expect(second.error).toBeUndefined();
      // Resend was not called for the capped attempt.
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("transactional sends are exempt from the cap", async () => {
      // Non-transactional send burns the recipient's daily slot.
      await sendEmail({
        to: "user@example.com",
        category: "lifecycle",
        subject: "Lifecycle",
        html: "<p>x</p>",
      });

      // A transactional follow-up still goes through (password reset,
      // payment receipt, etc. should never be queued or dropped).
      const transactional = await sendEmail({
        to: "user@example.com",
        category: "transactional",
        subject: "Receipt",
        html: "<p>x</p>",
      });
      expect(transactional.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("the cap is per recipient — two different recipients can both send", async () => {
      const a = await sendEmail({
        to: "a@example.com",
        category: "marketing",
        subject: "A",
        html: "<p>A</p>",
      });
      const b = await sendEmail({
        to: "b@example.com",
        category: "marketing",
        subject: "B",
        html: "<p>B</p>",
      });
      expect(a.success).toBe(true);
      expect(b.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("transactional sends do not block a later non-transactional send to the same recipient", async () => {
      // Inbound user action triggers a transactional email.
      await sendEmail({
        to: "user@example.com",
        category: "transactional",
        subject: "Welcome",
        html: "<p>x</p>",
      });
      // A scheduled marketing email later the same day should still go through.
      const marketing = await sendEmail({
        to: "user@example.com",
        category: "marketing",
        subject: "Newsletter",
        html: "<p>x</p>",
      });
      expect(marketing.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});

describe("getLifecycleEmail", () => {
  it("returns null for unknown email type", () => {
    const result = getLifecycleEmail("nonexistent_type", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
    });
    expect(result).toBeNull();
  });

  it("generates post_wedding_welcome email", () => {
    const result = getLifecycleEmail("post_wedding_welcome", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("Congratulations");
    expect(result!.subject).toContain("Alice &amp; Bob");
    expect(result!.html).toContain("12 months");
  });

  it("generates download_reminder_1mo email", () => {
    const result = getLifecycleEmail("download_reminder_1mo", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("Alice &amp; Bob");
    expect(result!.html).toContain("1 month post-wedding");
    expect(result!.html).toContain("Export your guest list");
  });

  it("generates download_reminder_6mo email", () => {
    const result = getLifecycleEmail("download_reminder_6mo", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("6 months");
    expect(result!.html).toContain("half-anniversary");
  });

  it("generates download_reminder_9mo email with unsubscribe footer for marketing", () => {
    const result = getLifecycleEmail("download_reminder_9mo", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
      unsubscribeToken: "tok-123",
    });

    expect(result).not.toBeNull();
    expect(result!.html).toContain("unsubscribe");
    expect(result!.html).toContain("tok-123");
  });

  it("generates memory_plan_offer email", () => {
    const result = getLifecycleEmail("memory_plan_offer", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
      unsubscribeToken: "tok-456",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("Keep your wedding website");
    expect(result!.html).toContain("$29/year");
  });

  it("generates archive_notice email", () => {
    const result = getLifecycleEmail("archive_notice", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
      unsubscribeToken: "tok-789",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("read-only");
    expect(result!.html).toContain("archived");
  });

  it("generates sunset_warning_21mo email", () => {
    const result = getLifecycleEmail("sunset_warning_21mo", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("deleted in 3 months");
    expect(result!.html).toContain("permanently deleted");
  });

  it("generates sunset_final email", () => {
    const result = getLifecycleEmail("sunset_final", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
    });

    expect(result).not.toBeNull();
    expect(result!.subject).toContain("Final notice");
    expect(result!.html).toContain("permanently deleted within the next few days");
  });

  it("transactional emails do not include unsubscribe footer", () => {
    const result = getLifecycleEmail("post_wedding_welcome", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
      unsubscribeToken: "tok-should-not-appear",
    });

    expect(result).not.toBeNull();
    expect(result!.html).not.toContain("tok-should-not-appear");
    expect(result!.html).toContain("Go to Dashboard");
  });

  it("escapes HTML in partner names", () => {
    const result = getLifecycleEmail("post_wedding_welcome", {
      partnerNames: '<script>alert("xss")</script>',
      weddingDate: "2025-09-20",
    });

    expect(result).not.toBeNull();
    expect(result!.html).not.toContain("<script>");
    expect(result!.subject).not.toContain("<script>");
  });

  it("marketing emails without unsubscribeToken use dashboard footer", () => {
    const result = getLifecycleEmail("download_reminder_9mo", {
      partnerNames: "Alice & Bob",
      weddingDate: "2025-09-20",
      // No unsubscribeToken
    });

    expect(result).not.toBeNull();
    expect(result!.html).toContain("Go to Dashboard");
  });
});

describe("sendCollaboratorInvite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("sends invite email with partner names and role", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockResolvedValue({ data: { id: "invite-1" }, error: null });

    const result = await sendCollaboratorInvite(
      "friend@example.com",
      "Alice & Bob",
      "coordinator"
    );

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.to).toBe("friend@example.com");
    expect(callArgs.html).toContain("Alice &amp; Bob");
    expect(callArgs.html).toContain("coordinator");
  });

  it("returns error when email service is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendCollaboratorInvite(
      "friend@example.com",
      "Alice & Bob",
      "partner"
    );

    expect(result.success).toBe(false);
  });
});
