/**
 * Shared input validation utilities for API routes.
 */

/** Pick only allowed keys from an object, dropping anything unexpected. */
export function pickFields<T extends Record<string, unknown>>(
  body: T,
  allowed: string[]
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      result[key] = body[key];
    }
  }
  return result as Partial<T>;
}

/** Validate that a value is one of an allowed set. */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** Validate a string field: non-empty, within max length. */
export function isValidString(value: unknown, maxLength = 500): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

/** Validate an optional string (null/undefined ok, string must be within max length). */
export function isValidOptionalString(value: unknown, maxLength = 2000): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.length <= maxLength);
}

/** Basic email format check. */
export function isValidEmail(value: unknown): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

/** Basic URL format check. */
export function isValidUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Check that a URL is safe for server-side fetching (no SSRF). */
export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();

    // Block localhost and loopback
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") return false;

    // Block private/internal IP ranges
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;

    // Block link-local and metadata endpoints
    if (hostname.startsWith("169.254.") || hostname === "metadata.google.internal") return false;

    // Block 0.0.0.0
    if (hostname === "0.0.0.0") return false;

    return true;
  } catch {
    return false;
  }
}

/** Validate a number is finite and optionally within a range. */
/** Reasonable upper bounds for numeric fields */
export const MAX_MONETARY_AMOUNT = 10_000_000; // $10M — generous ceiling for any wedding
export const MAX_GUEST_COUNT = 10_000;
export const MAX_CAPACITY = 1_000;

export function isValidNumber(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== "number" || !isFinite(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/** Validate a date string (YYYY-MM-DD). */
export function isValidDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

/** Validate a boolean. */
export function isValidBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Escape a string for safe interpolation into HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Return a 400 error response for validation failures. */
export function validationError(message: string) {
  return { error: message };
}

/**
 * Safely parse JSON from a request body.
 * Returns the parsed body or a 400 NextResponse on failure.
 */
export async function safeParseJSON(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    return await request.json();
  } catch {
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
}

/** Check if a safeParseJSON result is an error response. */
export function isParseError(result: Record<string, unknown> | Response): result is Response {
  return result instanceof Response;
}

/**
 * Validate required string fields exist and are non-empty.
 * Returns the first missing field name, or null if all are present.
 */
export function requireFields(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const val = body[field];
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      return field;
    }
  }
  return null;
}
