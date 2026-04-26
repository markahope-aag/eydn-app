import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { runSeedConfig, getDailyCap, getTodaysUsage, type SeedConfigRow } from "@/lib/places-seeder";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Weekly cron: pick up due seed configs and pull fresh vendors from
 * Google Places. Configs are due when next_run_at is null or in the past;
 * runSeedConfig stamps next_run_at = now + 30 days after each run.
 *
 * Schedule: 0 2 * * 0 (Sunday 02:00 UTC)
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper)
 */
export async function POST(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    const cap = getDailyCap();
    const usedAtStart = await getTodaysUsage(supabase);

    // Find due configs. The partial index covers the WHERE clause.
    const { data: configs, error } = await supabase
      .from("places_seed_configs")
      .select("id, category, city, state, country, max_results, enabled")
      .eq("enabled", true)
      .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`)
      .order("next_run_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (error) throw new Error(`Failed to fetch configs: ${error.message}`);

    const summary = {
      configsConsidered: (configs || []).length,
      configsRun: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalFetched: 0,
      costUnitsSpent: 0,
      capHit: false,
      errors: [] as string[],
    };

    for (const config of (configs || []) as SeedConfigRow[]) {
      if (summary.capHit) break;

      const result = await runSeedConfig(supabase, config);
      summary.configsRun++;
      summary.totalInserted += result.inserted;
      summary.totalUpdated += result.updated;
      summary.totalFetched += result.fetched;
      summary.costUnitsSpent += result.costUnitsSpent;
      if (result.error) summary.errors.push(`${config.category} / ${config.city}: ${result.error}`);
      if (result.capHit) summary.capHit = true;
    }

    console.info(
      `[SEED-VENDORS] ${summary.configsRun}/${summary.configsConsidered} configs ran, ` +
      `+${summary.totalInserted} new, ${summary.totalUpdated} refreshed, ` +
      `${summary.costUnitsSpent} units used (today: ${usedAtStart + summary.costUnitsSpent} / cap ${cap})`
    );

    await logCronExecution({
      jobName: "seed-vendors",
      status: summary.errors.length > 0 ? "error" : "success",
      durationMs: Date.now() - startTime,
      details: summary as unknown as import("@/lib/supabase/types").Json,
      errorMessage: summary.errors[0],
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SEED-VENDORS] Failed:", message);
    await logCronExecution({
      jobName: "seed-vendors",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
