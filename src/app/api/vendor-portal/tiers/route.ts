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
  const { data, error } = await supabase
    .from("placement_tiers")
    .select()
    .eq("active", true)
    .order("price_monthly", { ascending: true });

  const err = supabaseError(error, "vendor-portal/tiers");
  if (err) return err;

  return NextResponse.json(data);
}
