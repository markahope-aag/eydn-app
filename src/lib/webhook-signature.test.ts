import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "./webhook-signature";

const SECRET = "shared-secret-value";
const BODY = JSON.stringify({ event: "job.complete", job_id: "abc" });
const VALID_SIG = createHmac("sha256", SECRET).update(BODY).digest("hex");

describe("verifyWebhookSignature", () => {
  it("returns true for a correctly-signed body", () => {
    expect(verifyWebhookSignature(BODY, VALID_SIG, SECRET)).toBe(true);
  });

  it("returns false when the signature is wrong", () => {
    const wrong = createHmac("sha256", "different-secret").update(BODY).digest("hex");
    expect(verifyWebhookSignature(BODY, wrong, SECRET)).toBe(false);
  });

  it("returns false when the body has been tampered with", () => {
    expect(verifyWebhookSignature(BODY + "tampered", VALID_SIG, SECRET)).toBe(false);
  });

  it("returns false when the signature is missing", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "", SECRET)).toBe(false);
  });

  it("returns false when the secret is empty", () => {
    expect(verifyWebhookSignature(BODY, VALID_SIG, "")).toBe(false);
  });

  it("returns false when the signature has the wrong length", () => {
    expect(verifyWebhookSignature(BODY, "abcd", SECRET)).toBe(false);
  });

  it("returns false on non-hex characters in the signature", () => {
    expect(verifyWebhookSignature(BODY, "z".repeat(64), SECRET)).toBe(false);
  });
});
