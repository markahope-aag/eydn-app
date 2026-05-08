import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";
import type { Database } from "@/lib/supabase/types";

/**
 * Hourly cron: copy photos from the external scraper into suggested_vendors
 * for rows that landed without them. The scraper-import flow uses
 * upsert(ignoreDuplicates: true), which never updates existing rows — so
 * when the scraper populates vendors.photos *after* an Eydn import (via
 * the post-scrape photos phase or the admin backfill), those photos
 * never reach us. This job closes that gap.
 *
 * Schedule: 10 * * * * (every hour, 10 minutes after import-vendors)
 * Method: GET (Vercel cron always sends GET); POST aliased
 * Auth: Bearer CRON_SECRET (shared helper)
 *
 * Caps at 1000 Eydn rows per run. Lookup is cheap (two DB queries +
 * per-match UPDATE), so the throttle is lower than geocode-vendors.
 *
 * Re-running is safe — the photos = '[]' filter only picks up rows
 * that still need work.
 */

const PER_RUN_CAP = 1000;

interface ScraperPhoto {
  url: string;
  source: string;
  width: number | null;
  height: number | null;
  attribution: string | null;
  fetched_at: string;
}

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const scraperUrl = process.env.SCRAPER_SUPABASE_URL;
  const scraperKey = process.env.SCRAPER_SUPABASE_KEY;
  if (!scraperUrl || !scraperKey) {
    await logCronExecution({
      jobName: "sync-vendor-photos",
      status: "error",
      durationMs: 0,
      errorMessage: "Skipped: SCRAPER_SUPABASE_URL or SCRAPER_SUPABASE_KEY not set",
    });
    return NextResponse.json(
      { ok: false, error: "scraper credentials not configured" },
      { status: 200 }
    );
  }

  const start = Date.now();
  const eydn = createSupabaseAdmin();
  const scraper = createClient(scraperUrl, scraperKey, {
    auth: { persistSession: false },
  });

  // Page 1: Eydn rows still waiting for photos.
  const { data: needPhotos, error: fetchErr } = await eydn
    .from("suggested_vendors")
    .select("id, scraper_id")
    .eq("active", true)
    .eq("photos", "[]")
    .not("scraper_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(PER_RUN_CAP);

  if (fetchErr) {
    await logCronExecution({
      jobName: "sync-vendor-photos",
      status: "error",
      durationMs: Date.now() - start,
      errorMessage: `Fetch from eydn failed: ${fetchErr.message}`,
    });
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!needPhotos || needPhotos.length === 0) {
    await logCronExecution({
      jobName: "sync-vendor-photos",
      status: "success",
      durationMs: Date.now() - start,
      details: { examined: 0, synced: 0 },
    });
    return NextResponse.json({ examined: 0, synced: 0, durationMs: Date.now() - start });
  }

  // Page 2: scraper rows for those IDs that actually have photos. Filter
  // server-side so we only pay round-trip cost for rows that need an UPDATE.
  const scraperIds = needPhotos
    .map((r) => r.scraper_id)
    .filter((id): id is string => Boolean(id));
  const { data: scraperRows, error: scraperErr } = await scraper
    .from("vendors")
    .select("id, photos")
    .in("id", scraperIds)
    .neq("photos", "[]");

  if (scraperErr) {
    await logCronExecution({
      jobName: "sync-vendor-photos",
      status: "error",
      durationMs: Date.now() - start,
      errorMessage: `Fetch from scraper failed: ${scraperErr.message}`,
    });
    return NextResponse.json({ error: scraperErr.message }, { status: 500 });
  }

  // Build scraper_id → photos map. Use the scraper's photos array verbatim
  // (same shape as suggested_vendors.photos — that's the contract enforced
  // by the import code).
  const photosByScraperId = new Map<string, ScraperPhoto[]>();
  for (const row of scraperRows ?? []) {
    photosByScraperId.set(row.id, row.photos as ScraperPhoto[]);
  }

  let synced = 0;
  let failed = 0;
  for (const row of needPhotos) {
    if (!row.scraper_id) continue;
    const photos = photosByScraperId.get(row.scraper_id);
    if (!photos || photos.length === 0) continue;

    const { error: updateErr } = await eydn
      .from("suggested_vendors")
      .update({
        photos: photos as unknown as Database["public"]["Tables"]["suggested_vendors"]["Update"]["photos"],
      })
      .eq("id", row.id);
    if (updateErr) {
      failed++;
      console.warn(
        `[sync-vendor-photos] update failed for ${row.id}: ${updateErr.message}`
      );
    } else {
      synced++;
    }
  }

  const durationMs = Date.now() - start;
  await logCronExecution({
    jobName: "sync-vendor-photos",
    status: failed > 0 ? "error" : "success",
    durationMs,
    details: {
      examined: needPhotos.length,
      with_photos_on_scraper: photosByScraperId.size,
      synced,
      failed,
      cap: PER_RUN_CAP,
    },
  });

  return NextResponse.json({
    examined: needPhotos.length,
    with_photos_on_scraper: photosByScraperId.size,
    synced,
    failed,
    durationMs,
  });
}

// Vercel cron always sends GET; alias POST so admin "Run now" works.
export const POST = GET;
