import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const BASE_URL = "https://places.googleapis.com/v1";
const PHOTO_MAX_WIDTH_PX = 400;
const FETCH_TIMEOUT_MS = 10_000;

/** Google occasionally answers a perfectly valid photo reference with a
 *  transient 429 (rate limit) or 5xx. One quick retry turns most of those
 *  into a successful load instead of a broken image. A 4xx other than 429
 *  (e.g. a stale/expired ref) won't fix itself, so we fail fast on those. */
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 2;

/**
 * Fetch the photo bytes from Google, retrying once on transient failures.
 * Returns the upstream Response on success (HTTP 2xx) or null when the photo
 * can't be retrieved — the caller maps null to a 404.
 */
async function fetchPhoto(ref: string): Promise<Response | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/${ref}/media?maxWidthPx=${PHOTO_MAX_WIDTH_PX}`, {
        headers: { "X-Goog-Api-Key": API_KEY },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (res.ok) return res;
      // Non-transient (bad/stale ref, auth) — retrying won't help.
      if (!TRANSIENT_STATUSES.has(res.status)) return null;
    } catch {
      // Network error or timeout — fall through to retry / give up.
    }
  }
  return null;
}

/**
 * Proxy for Google Places photo media.
 * Keeps the API key server-side instead of exposing it in client URLs.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");

  if (!ref || !ref.startsWith("places/")) {
    return NextResponse.json({ error: "Invalid photo reference" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "Google Places not configured" }, { status: 500 });
  }

  const photoRes = await fetchPhoto(ref);
  if (!photoRes) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Only pass through real image bytes. Google can answer a missing/expired
  // photo with a 200 carrying a JSON error body; forwarding that as
  // image/jpeg would render as a broken image. Reject anything non-image so
  // the client's onError fallback fires instead.
  const contentType = photoRes.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const buffer = await photoRes.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
}
