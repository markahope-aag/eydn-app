import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { runScraperImport } from "@/lib/scraper-import";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Hourly cron: pull new vendors from the external scraper's Supabase,
 * apply Eydn's quality rules, and ingest qualifying rows into the directory.
 * Rejected rows are logged to vendor_import_rejections for admin review.
 *
 * Schedule: 0 * * * * (every hour)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper)
 *
 * Env vars required (configured in Vercel):
 *   SCRAPER_SUPABASE_URL       e.g. https://slotytafwafinyzdrpsh.supabase.co
 *   SCRAPER_SUPABASE_KEY       service role key (read access to vendors table)
 *   SCRAPER_EYDN_CLIENT_ID     UUID of the scraper's client_id row that
 *                              represents Eydn's data segregation tenant
 *
 * Missing env vars cause the cron to no-op gracefully (returns 200 with a
 * note) rather than failing — this lets the schedule remain enabled while
 * the operator wires up credentials.
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
    const result = await runScraperImport(supabase, scraperUrl, scraperKey, clientId);

    const status = result.errors.length > 0 ? "error" : "success";
    console.info(
      `[IMPORT-VENDORS] scanned=${result.scannedFromScraper} ` +
      `seen=${result.alreadySeen} inserted=${result.inserted} ` +
      `rejected=${result.rejected} errors=${result.errors.length}`
    );

    await logCronExecution({
      jobName: "import-vendors",
      status,
      durationMs: Date.now() - startTime,
      details: result as unknown as import("@/lib/supabase/types").Json,
      errorMessage: result.errors[0],
    });

    return NextResponse.json({ ok: status === "success", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[IMPORT-VENDORS] failed:", message);
    await logCronExecution({
      jobName: "import-vendors",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
