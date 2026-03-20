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

  const { data, error } = await supabase
    .from("vendor_placements")
    .select("*, placement_tiers(*)")
    .eq("vendor_account_id", vendor.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
