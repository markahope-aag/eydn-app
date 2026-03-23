import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Get vendor account
  const { data: vendor } = await supabase
    .from("vendor_accounts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor account not found" }, { status: 404 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  // Get analytics for last 30 days
  const { data: analytics, error } = await supabase
    .from("vendor_analytics")
    .select("event_type, created_at")
    .eq("vendor_account_id", vendor.id)
    .gte("created_at", since);

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const impressions = (analytics || []).filter(
    (a) => a.event_type === "impression"
  ).length;
  const clicks = (analytics || []).filter(
    (a) => a.event_type === "click"
  ).length;
  const leads = (analytics || []).filter(
    (a) => a.event_type === "lead"
  ).length;

  return NextResponse.json({
    impressions,
    clicks,
    leads,
    period: "last_30_days",
    since,
  });
}
