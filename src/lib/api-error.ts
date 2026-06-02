import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Standard API error response. Use in catch blocks or after Supabase errors.
 * Logs the error server-side (structured, via the shared Pino logger → Axiom)
 * and returns a clean JSON response to the client.
 */
export function apiError(
  message: string,
  status: number = 500,
  context?: string
): NextResponse {
  const fields = context ? { context, status } : { status };
  if (status >= 500) {
    logger.error(fields, message);
  } else {
    logger.warn(fields, message);
  }
  return NextResponse.json(
    { error: status >= 500 ? "Internal server error" : message },
    { status }
  );
}

/**
 * Handle a Supabase query error. Returns a NextResponse if there's an error, null if OK.
 * Usage: const err = supabaseError(error, "tasks"); if (err) return err;
 */
export function supabaseError(
  error: { message: string } | null,
  context?: string
): NextResponse | null {
  if (!error) return null;
  return apiError(error.message, 500, context);
}
