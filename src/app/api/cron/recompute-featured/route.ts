import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { applyFeaturedRule } from "@/lib/vendors/featured";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Nightly safety-net cron: recompute the auto-featured top-N% per category.
 *
 * The rule is also called from runScraperImport, runScraperRefresh, and the
 * admin PATCH handler — those are the primary triggers. This cron exists to
 * catch anything that slipped through (direct DB edits, partial failures,
 * a category that nobody touched today but has a stale featured set from
 * an earlier write).
 *
 * Schedule: 0 4 * * * (daily 04:30 UTC — runs after the import-vendors hour
 * tick completes, before the morning traffic).
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    const result = await applyFeaturedRule(supabase);
    console.info(
      `[RECOMPUTE-FEATURED] categories=${Object.keys(result.perCategory).length} ` +
      `changed=${result.totalChanged}`
    );
    await logCronExecution({
      jobName: "recompute-featured",
      status: "success",
      durationMs: Date.now() - startTime,
      details: result as unknown as import("@/lib/supabase/types").Json,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[RECOMPUTE-FEATURED] failed:", message);
    await logCronExecution({
      jobName: "recompute-featured",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel cron always sends GET; admin manual-trigger UI POSTs internally.
// Re-export so both work.
export const POST = GET;
