import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { enrichVendor } from "@/lib/google-places";

/**
 * POST /api/vendors/places-search
 *
 * Look up a business in Google Places given a name + optional category +
 * optional city/state. Returns the top match's enriched PlaceData (no DB
 * writes). Used by the couple's "Add Vendor" form to enrich a vendor that
 * isn't in Eydn's directory yet.
 *
 * Auth: any signed-in user (not admin-only — couples need this in the
 * normal add-vendor flow).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Vendor lookup is unavailable right now. You can still add the vendor manually." },
      { status: 503 }
    );
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as { name?: unknown; category?: unknown; location?: unknown };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const category = typeof body.category === "string" ? body.category : undefined;
  const location = typeof body.location === "string" ? body.location.trim() || undefined : undefined;

  const place = await enrichVendor(name, category, location);
  if (!place) {
    return NextResponse.json({ place: null, message: "No Google match found" });
  }

  return NextResponse.json({ place });
}
