/**
 * HMAC-SHA256 signature verification for inbound webhooks.
 * Pure function for testability — no IO, no env, no req object.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify that `signatureHex` matches HMAC-SHA256(secret, body) using a
 * constant-time comparison to defeat timing attacks.
 *
 * Returns false on any malformed input rather than throwing — webhook
 * signature checks should be a single boolean gate the caller acts on.
 */
export function verifyWebhookSignature(
  body: string,
  signatureHex: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHex || !secret) return false;
  let expected: Buffer;
  try {
    expected = createHmac("sha256", secret).update(body).digest();
  } catch {
    return false;
  }
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHex, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(expected, provided);
}
