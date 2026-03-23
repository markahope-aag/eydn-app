import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { enrichVendor } from "@/lib/google-places";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();

  // Get the suggested vendor
  const { data: vendor } = await supabase
    .from("suggested_vendors")
    .select("id, name, category, city, state")
    .eq("id", id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  const location = [vendor.city, vendor.state].filter(Boolean).join(", ");
  const placeData = await enrichVendor(vendor.name, vendor.category, location);

  if (!placeData) {
    return NextResponse.json(
      { error: "Could not find this business on Google." },
      { status: 404 }
    );
  }

  return NextResponse.json(placeData);
}
