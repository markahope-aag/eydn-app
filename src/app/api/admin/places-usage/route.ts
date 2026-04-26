import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { getDailyCap, getTodaysUsage } from "@/lib/places-seeder";

/**
 * GET /api/admin/places-usage — Places API spend snapshot for the admin UI.
 * Returns today's cost units used vs. the configured daily cap.
 */
export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const cap = getDailyCap();
  const used = await getTodaysUsage(supabase);
  return NextResponse.json({
    capUnits: cap,
    usedUnitsToday: used,
    remainingUnits: Math.max(0, cap - used),
    capHit: used >= cap,
  });
}
