import { NextResponse } from "next/server";

/**
 * Standard API error response. Use in catch blocks or after Supabase errors.
 * Logs the error server-side and returns a clean JSON response to the client.
 */
export function apiError(
  message: string,
  status: number = 500,
  context?: string
): NextResponse {
  if (context) {
    console.error(`[API] ${context}:`, message);
  } else {
    console.error("[API]", message);
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
