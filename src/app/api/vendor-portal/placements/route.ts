import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

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

  const err = supabaseError(error, "vendor-portal/placements");
  if (err) return err;

  return NextResponse.json(data);
}
