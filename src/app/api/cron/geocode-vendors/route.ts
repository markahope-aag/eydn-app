import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { geocodeAddress, buildVendorAddress } from "@/lib/geocoding";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Hourly cron: geocode any active vendors that arrived without lat/lng. The
 * import-vendors cron and bulk admin imports skip geocoding to keep batch
 * inserts fast — this job is the catch-up that ensures every active vendor
 * eventually gets coordinates so the directory's radius search includes them.
 *
 * Schedule: 5 * * * * (every hour, 5 minutes after import-vendors)
 * Method: GET (Vercel cron always sends GET)
 * Auth: Bearer CRON_SECRET (shared helper)
 *
 * Caps each run at 500 vendors and throttles to ~10 req/sec to stay well
 * under Google Geocoding's 50 QPS limit and within Vercel's 60s function
 * timeout. With ~6,500 ungeocoded vendors after a fresh import, the queue
 * drains in under three runs.
 *
 * Re-running is safe — the .is("lat", null) filter only picks up rows that
 * still need work. Failed geocodes (ZERO_RESULTS, REQUEST_DENIED, etc.) are
 * NOT retried automatically; they're logged via console.warn and need
 * operator attention via the admin Vendor Stats page.
 */

const PER_RUN_CAP = 500;
const THROTTLE_MS = 100; // ~10 req/sec

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const start = Date.now();
  const supabase = createSupabaseAdmin();

  const { data: vendors, error } = await supabase
    .from("suggested_vendors")
    .select("id, address, city, state, zip, country")
    .eq("active", true)
    .is("lat", null)
    .order("created_at", { ascending: true })
    .limit(PER_RUN_CAP);

  if (error) {
    await logCronExecution({
      jobName: "geocode-vendors",
      status: "error",
      durationMs: Date.now() - start,
      errorMessage: `Fetch failed: ${error.message}`,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of vendors ?? []) {
    const address = buildVendorAddress(v);
    if (!address) {
      skipped++;
      continue;
    }
    const result = await geocodeAddress(address);
    if (!result) {
      failed++;
    } else {
      const { error: updateErr } = await supabase
        .from("suggested_vendors")
        .update({
          lat: result.lat,
          lng: result.lng,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", v.id);
      if (updateErr) {
        failed++;
        console.warn(`[geocode-vendors] update failed for ${v.id}: ${updateErr.message}`);
      } else {
        geocoded++;
      }
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  const durationMs = Date.now() - start;
  await logCronExecution({
    jobName: "geocode-vendors",
    status: "success",
    durationMs,
    details: {
      examined: vendors?.length ?? 0,
      geocoded,
      skipped,
      failed,
      cap: PER_RUN_CAP,
    },
  });

  return NextResponse.json({
    examined: vendors?.length ?? 0,
    geocoded,
    skipped,
    failed,
    durationMs,
  });
}

// Vercel cron always sends GET; alias POST so admin "Run now" buttons work.
export const POST = GET;
