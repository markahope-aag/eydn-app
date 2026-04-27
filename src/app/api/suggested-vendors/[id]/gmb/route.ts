import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { enrichVendor } from "@/lib/google-places";
import type { Json } from "@/lib/supabase/types";

/** How long a cached GMB row is considered fresh. Photos and ratings drift
 *  slowly; 30 days keeps Google API spend low without serving truly stale
 *  data. The weekly refresh-vendors cron will eventually pick up changes. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

  const { data: vendor } = await supabase
    .from("suggested_vendors")
    .select("id, name, category, city, state, gmb_data, gmb_last_refreshed_at")
    .eq("id", id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Cache hit — return persisted enrichment if it's fresh. Saves ~$0.05
  // per repeat open and renders instantly.
  if (vendor.gmb_data && vendor.gmb_last_refreshed_at) {
    const fetchedAt = new Date(vendor.gmb_last_refreshed_at).getTime();
    if (Date.now() - fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json(vendor.gmb_data);
    }
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

  // Cache for the next 30 days. Non-blocking — a write failure shouldn't
  // delay the response, and the next request will just re-fetch.
  supabase
    .from("suggested_vendors")
    .update({
      gmb_data: placeData as unknown as Json,
      gmb_place_id: placeData.placeId,
      gmb_last_refreshed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .then(() => {});

  return NextResponse.json(placeData);
}
