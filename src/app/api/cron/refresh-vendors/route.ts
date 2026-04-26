import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { runScraperRefresh } from "@/lib/scraper-import";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Weekly cron: refresh scraper-sourced vendors that haven't been re-pulled
 * in 90+ days. Updates mutable fields (name, contact, description, score,
 * extras, active flag) in place. Quality rules are NOT re-applied —
 * once a vendor has passed the gate, it stays in the directory unless
 * an admin removes it. The refresh just keeps the data fresh.
 *
 * Schedule: 0 3 * * 6 (Saturdays 03:00 UTC)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper)
 *
 * Bounded to 100 vendors per run via runScraperRefresh's MAX_REFRESH_BATCH.
 * If the directory grows large enough that 100/week isn't enough, increase
 * the cron frequency rather than the batch size — keeps any single Supabase
 * round-trip predictable.
 */
export async function POST(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const scraperUrl = process.env.SCRAPER_SUPABASE_URL;
  const scraperKey = process.env.SCRAPER_SUPABASE_KEY;
  const clientId = process.env.SCRAPER_EYDN_CLIENT_ID;

  if (!scraperUrl || !scraperKey || !clientId) {
    const missing = [
      !scraperUrl && "SCRAPER_SUPABASE_URL",
      !scraperKey && "SCRAPER_SUPABASE_KEY",
      !clientId && "SCRAPER_EYDN_CLIENT_ID",
    ].filter(Boolean).join(", ");
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Scraper credentials not configured. Missing: ${missing}`,
    });
  }

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    const result = await runScraperRefresh(supabase, scraperUrl, scraperKey, clientId);

    const status = result.errors.length > 0 ? "error" : "success";
    console.info(
      `[REFRESH-VENDORS] candidates=${result.candidatesScanned} ` +
      `refreshed=${result.refreshed} not_found=${result.notFoundInScraper} ` +
      `errors=${result.errors.length}`
    );

    await logCronExecution({
      jobName: "refresh-vendors",
      status,
      durationMs: Date.now() - startTime,
      details: result as unknown as import("@/lib/supabase/types").Json,
      errorMessage: result.errors[0],
    });

    return NextResponse.json({ ok: status === "success", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[REFRESH-VENDORS] failed:", message);
    await logCronExecution({
      jobName: "refresh-vendors",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
