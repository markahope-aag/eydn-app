import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runScraperImport } from "@/lib/scraper-import";
import { logCronExecution } from "@/lib/cron-logger";

export const maxDuration = 60;

/**
 * POST /api/admin/scraper-import
 *
 * On-demand sibling of the hourly /api/cron/import-vendors job. Lets an admin
 * pull from the scraper without waiting for the next cron tick or a webhook.
 *
 * Same code path, same env vars, same dedup — just synchronous and gated by
 * admin auth instead of CRON_SECRET. Logged to cron_log as
 * `import-vendors-manual` so manual runs are distinguishable in audits.
 */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const scraperUrl = process.env.SCRAPER_SUPABASE_URL;
  const scraperKey = process.env.SCRAPER_SUPABASE_KEY;
  const clientId = process.env.SCRAPER_EYDN_CLIENT_ID;

  if (!scraperUrl || !scraperKey || !clientId) {
    const missing = [
      !scraperUrl && "SCRAPER_SUPABASE_URL",
      !scraperKey && "SCRAPER_SUPABASE_KEY",
      !clientId && "SCRAPER_EYDN_CLIENT_ID",
    ].filter(Boolean).join(", ");
    return NextResponse.json(
      { error: `Scraper credentials not configured. Missing: ${missing}` },
      { status: 503 }
    );
  }

  const startTime = Date.now();
  try {
    const result = await runScraperImport(supabase, scraperUrl, scraperKey, clientId);
    await logCronExecution({
      jobName: "import-vendors-manual",
      status: result.errors.length > 0 ? "error" : "success",
      durationMs: Date.now() - startTime,
      details: { ...result, triggered_by: userId } as unknown as import("@/lib/supabase/types").Json,
      errorMessage: result.errors[0],
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logCronExecution({
      jobName: "import-vendors-manual",
      status: "error",
      durationMs: Date.now() - startTime,
      details: { triggered_by: userId } as unknown as import("@/lib/supabase/types").Json,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
