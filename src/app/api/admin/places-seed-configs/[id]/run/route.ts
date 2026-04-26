import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { runSeedConfig, type SeedConfigRow } from "@/lib/places-seeder";

/**
 * POST /api/admin/places-seed-configs/[id]/run — trigger one config now.
 * Same code path as the cron, just for one row. Honors the daily cost cap.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;
  const { id } = await ctx.params;

  const { data: config, error } = await supabase
    .from("places_seed_configs")
    .select("id, category, city, state, country, max_results, enabled")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!config) return NextResponse.json({ error: "not found" }, { status: 404 });

  const runResult = await runSeedConfig(supabase, config as SeedConfigRow);
  return NextResponse.json(runResult);
}
