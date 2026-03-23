import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("vendor_placements")
    .select(`
      id, vendor_account_id, tier_id, billing_period, amount_paid, starts_at, expires_at, auto_renew, stripe_subscription_id, status, created_at,
      vendor_accounts ( id, business_name, category, city, state, email ),
      placement_tiers ( name, price_monthly )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Calculate revenue totals
  const totalRevenue = (data || [])
    .filter((p) => p.status === "active" || p.status === "past_due")
    .reduce((sum, p) => {
      const monthly = p.placement_tiers?.price_monthly || 0;
      return sum + monthly;
    }, 0);

  const activePlacements = (data || []).filter(
    (p) => p.status === "active"
  ).length;

  return NextResponse.json({
    placements: data,
    total_monthly_revenue: totalRevenue,
    active_placements: activePlacements,
  });
}
