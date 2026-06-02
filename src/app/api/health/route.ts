import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

// Always run fresh — this is a liveness probe, never cache it.
export const dynamic = "force-dynamic";

/**
 * Public health/liveness endpoint for an external uptime monitor to ping.
 * Returns 200 when the app and database are reachable, 503 otherwise. Exposes
 * no sensitive data — just status flags and response time.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;

  try {
    const supabase = createSupabaseAdmin();
    // Cheap reachability check — LIMIT 1, no count scan.
    const { error } = await supabase.from("weddings").select("id").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "ok" : "down",
      responseMs: Date.now() - startedAt,
    },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
