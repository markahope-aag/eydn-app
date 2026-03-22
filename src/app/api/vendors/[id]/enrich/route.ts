import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { enrichVendor } from "@/lib/google-places";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { id } = await ctx.params;

  // Get the vendor
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, category, gmb_data, gmb_fetched_at")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Return cached data if fetched within the last 7 days
  if (vendor.gmb_data && vendor.gmb_fetched_at) {
    const fetchedAt = new Date(vendor.gmb_fetched_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (fetchedAt > sevenDaysAgo) {
      return NextResponse.json(vendor.gmb_data);
    }
  }

  // Fetch from Google Places
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  const placeData = await enrichVendor(vendor.name, vendor.category);

  if (!placeData) {
    return NextResponse.json(
      { error: "Could not find this business on Google. Try updating the vendor name to match their Google listing." },
      { status: 404 }
    );
  }

  // Cache in database
  await supabase
    .from("vendors")
    .update({
      gmb_place_id: placeData.placeId,
      gmb_data: placeData as unknown as Record<string, unknown>,
      gmb_fetched_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  return NextResponse.json(placeData);
}
