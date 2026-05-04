#!/usr/bin/env node
// Re-evaluate every row in vendor_import_rejections against the CURRENT
// quality rules. Rows that now pass are inserted into suggested_vendors and
// removed from the rejection log. Rows that still fail are left in place
// with their failed_rules updated to reflect the latest evaluation.
//
// Usage:
//   node scripts/reprocess-vendor-rejections.mjs                # dry run
//   node scripts/reprocess-vendor-rejections.mjs --apply        # actually write
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");

function readEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Mirror QUALITY_RULES from src/lib/vendors/quality.ts. If those change in
// code, update here too — this is a one-shot operational script, not a
// shared module, so duplicating is cheaper than wiring TS imports.
const MIN_SCORE = 35;
const ACCEPTABLE_DESCRIPTION_STATUSES = new Set(["ai_generated", "manually_written"]);

function nonEmpty(s) {
  return typeof s === "string" && s.trim().length > 0;
}

// `scraper_data` is the original scraper-side row (snake_case fields), not
// Eydn's normalized candidate. Mirror just enough of the import-time
// normalize+candidate-build steps to evaluate the new rules — full
// re-import (including AI category resolution) happens after we delete
// the rejection row, so the row goes through the live cron path.
function evaluate(scraperRow) {
  const failed = [];

  if (scraperRow.eydn_score == null) {
    failed.push(`missing quality_score (min: ${MIN_SCORE})`);
  } else if (scraperRow.eydn_score < MIN_SCORE) {
    failed.push(`quality_score below threshold: ${scraperRow.eydn_score} < ${MIN_SCORE}`);
  }

  if (!nonEmpty(scraperRow.phone) && !nonEmpty(scraperRow.website)) {
    failed.push("no contact method (need phone or website)");
  }

  if (!scraperRow.description_status) {
    failed.push("description_status missing");
  } else if (!ACCEPTABLE_DESCRIPTION_STATUSES.has(scraperRow.description_status)) {
    failed.push(`description_status not finalized: ${scraperRow.description_status}`);
  }

  // Hard structural fields — match scraper-import.ts:235.
  if (!nonEmpty(scraperRow.name)) failed.push("missing name");
  if (!nonEmpty(scraperRow.city)) failed.push("missing city");
  if (!nonEmpty(scraperRow.state) || scraperRow.state.length !== 2) {
    failed.push(`invalid state '${scraperRow.state ?? ""}'`);
  }

  return failed;
}

async function main() {
  console.log(APPLY ? "MODE: apply" : "MODE: dry-run (use --apply to write)");

  const PAGE = 1000;
  let from = 0;
  let total = 0;
  let nowPasses = 0;
  let stillFails = 0;
  const reasonsBefore = new Map();
  const reasonsAfter = new Map();

  while (true) {
    const { data: rows, error } = await supabase
      .from("vendor_import_rejections")
      .select("id, scraper_id, scraper_data, failed_rules")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      total++;
      for (const r of row.failed_rules ?? []) {
        reasonsBefore.set(r, (reasonsBefore.get(r) ?? 0) + 1);
      }

      const failed = evaluate(row.scraper_data ?? {});
      if (failed.length === 0) {
        nowPasses++;
      } else {
        stillFails++;
        for (const r of failed) {
          reasonsAfter.set(r, (reasonsAfter.get(r) ?? 0) + 1);
        }
      }
    }

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  console.log("\n=== Summary ===");
  console.log(`scanned:       ${total}`);
  console.log(`now passes:    ${nowPasses}`);
  console.log(`still fails:   ${stillFails}`);

  console.log("\n=== Reasons BEFORE (top 10) ===");
  [...reasonsBefore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(
    ([r, n]) => console.log(`  ${String(n).padStart(5)}  ${r}`)
  );

  console.log("\n=== Reasons AFTER under new rules (top 10) ===");
  [...reasonsAfter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(
    ([r, n]) => console.log(`  ${String(n).padStart(5)}  ${r}`)
  );

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to:");
    console.log(`  - delete ${nowPasses} rejection rows so the next import-vendors run picks them up`);
    console.log(`  - update failed_rules on the ${stillFails} that still fail (so the admin UI shows current reasons)`);
    return;
  }

  // Phase 1: delete rejection rows that now pass — the next cron pulls
  // from the scraper using `created_at desc` + dedup by scraper_id, so
  // removing the rejection unblocks them automatically. We don't insert
  // into suggested_vendors here because the import path also runs AI
  // category resolution + featured recompute — keep one source of truth.
  const PASS_BATCH = 200;
  let deleted = 0;
  const passIds = [];

  // Re-scan for the actual ids that now pass — the loop above didn't keep
  // them. Cheap to do twice.
  let scanFrom = 0;
  while (true) {
    const { data: rows, error } = await supabase
      .from("vendor_import_rejections")
      .select("id, scraper_data")
      .order("created_at", { ascending: true })
      .range(scanFrom, scanFrom + PAGE - 1);
    if (error) throw error;
    if (!rows || rows.length === 0) break;
    for (const r of rows) {
      if (evaluate(r.scraper_data ?? {}).length === 0) passIds.push(r.id);
    }
    if (rows.length < PAGE) break;
    scanFrom += PAGE;
  }

  for (let i = 0; i < passIds.length; i += PASS_BATCH) {
    const slice = passIds.slice(i, i + PASS_BATCH);
    const { error } = await supabase
      .from("vendor_import_rejections")
      .delete()
      .in("id", slice);
    if (error) {
      console.error(`delete batch ${i}: ${error.message}`);
      continue;
    }
    deleted += slice.length;
    console.log(`deleted ${deleted}/${passIds.length}`);
  }

  console.log(`\nDone. Deleted ${deleted} rejection rows.`);
  console.log(
    "Trigger /api/cron/import-vendors (or wait for the hourly cron) to actually import them."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
