import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildUnsubscribeUrl, emailFooterHtml } from "./email-preferences";

describe("buildUnsubscribeUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it("generates URL with token and default type=all", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
    const url = buildUnsubscribeUrl("abc123");
    expect(url).toBe("https://eydn.app/api/public/unsubscribe?token=abc123&type=all");
  });

  it("generates URL with specific type", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
    const url = buildUnsubscribeUrl("token456", "marketing");
    expect(url).toBe("https://eydn.app/api/public/unsubscribe?token=token456&type=marketing");
  });

  it("generates URL with type=deadlines", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
    const url = buildUnsubscribeUrl("tok", "deadlines");
    expect(url).toBe("https://eydn.app/api/public/unsubscribe?token=tok&type=deadlines");
  });

  it("generates URL with type=lifecycle", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
    const url = buildUnsubscribeUrl("tok", "lifecycle");
    expect(url).toBe("https://eydn.app/api/public/unsubscribe?token=tok&type=lifecycle");
  });

  it("uses fallback base URL when env var is not set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const url = buildUnsubscribeUrl("fallback-token");
    expect(url).toBe("https://eydn.app/api/public/unsubscribe?token=fallback-token&type=all");
  });
});

describe("emailFooterHtml", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://eydn.app";
  });

  it("includes unsubscribe link for the specific type", () => {
    const html = emailFooterHtml("mytoken", "marketing");
    expect(html).toContain("token=mytoken&type=marketing");
  });

  it("includes unsubscribe-all link", () => {
    const html = emailFooterHtml("mytoken", "marketing");
    expect(html).toContain("token=mytoken&type=all");
  });

  it("includes manage preferences link", () => {
    const html = emailFooterHtml("mytoken");
    expect(html).toContain("https://eydn.app/dashboard/settings");
  });

  it("includes physical address for CAN-SPAM compliance", () => {
    const html = emailFooterHtml("mytoken");
    expect(html).toContain("Madison, WI 53713");
  });

  it("includes Eydn branding", () => {
    const html = emailFooterHtml("mytoken");
    expect(html).toContain("Eydn");
  });

  it("uses default type of marketing when not specified", () => {
    const html = emailFooterHtml("tok123");
    expect(html).toContain("token=tok123&type=marketing");
  });
});
