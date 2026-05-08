import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { enrichVendor } from "@/lib/google-places";
import { requireFeature } from "@/lib/subscription";
import {
  DAILY_CAP,
  findCachedLookup,
  getDailyUsage,
  logLookup,
  makeCacheKey,
} from "@/lib/vendor-seed-quota";

/**
 * POST /api/vendors/places-search
 *
 * Look up a business in Google Places given a name + optional category +
 * optional city/state. Returns the top match's enriched PlaceData (no DB
 * writes here — directory + scraper writes happen in /api/vendors/from-place
 * after the user picks a result).
 *
 * Cost: ~$0.052 per call (text search $0.035 + place details $0.017).
 *
 * Cost/abuse controls:
 *   - Subscription gate: vendorLookup feature (free tier blocked, returns 402)
 *   - Daily cap: 20 chargeable lookups per user (returns 429)
 *   - 24h dedupe cache: identical name+location queries reuse the prior
 *     result without burning another lookup. Cache hits don't count.
 *
 * Response: { place, cached, usage: { used, remaining, cap } }
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireFeature("vendorLookup");
  if (gate) return gate;

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
  const location =
    typeof body.location === "string" ? body.location.trim() || undefined : undefined;

  // 1. Cache lookup. Match the cache_key the same way for both `match` and
  //    `no_match` results — repeated null lookups should also short-circuit.
  const cacheKey = makeCacheKey(name, location);
  const cached = await findCachedLookup(cacheKey);
  if (cached) {
    const usage = await getDailyUsage(userId);
    return NextResponse.json({
      place: cached.result === "match" ? cached.placeData : null,
      cached: true,
      message:
        cached.result === "no_match"
          ? "No Google match found (cached)"
          : undefined,
      usage,
    });
  }

  // 2. Daily cap check. Subscribers get 20 cost-incurring lookups per UTC day.
  const usage = await getDailyUsage(userId);
  if (usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: `Daily lookup limit reached (${DAILY_CAP}/day). Resets at midnight UTC.`,
        usage,
      },
      { status: 429 }
    );
  }

  // 3. Live Google Places call. Two SKUs (search + details).
  let place;
  try {
    place = await enrichVendor(name, category, location);
  } catch (err) {
    await logLookup({
      userId,
      name,
      location: location ?? null,
      result: "error",
      placeId: null,
      placeData: null,
    });
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 4. Log + return. We log the full place_data on match so future cache
  //    hits don't have to re-call Google's details endpoint.
  await logLookup({
    userId,
    name,
    location: location ?? null,
    result: place ? "match" : "no_match",
    placeId: place?.placeId ?? null,
    placeData: place,
  });

  const updatedUsage = await getDailyUsage(userId);
  if (!place) {
    return NextResponse.json({
      place: null,
      cached: false,
      message: "No Google match found",
      usage: updatedUsage,
    });
  }
  return NextResponse.json({ place, cached: false, usage: updatedUsage });
}
