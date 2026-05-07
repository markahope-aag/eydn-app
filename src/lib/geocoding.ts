/**
 * Google Geocoding wrapper. Resolves a free-text location string (city,
 * "City, State", full address) into lat/lng + a normalized formatted address.
 *
 * Reuses GOOGLE_PLACES_API_KEY by default — the same Google Cloud project
 * that powers vendor enrichment also serves Geocoding when the API is
 * enabled. Override with a dedicated GOOGLE_GEOCODING_API_KEY if you want
 * separate billing or quotas.
 *
 * Pricing as of 2026: $5 / 1,000 requests, with a $200/mo free credit
 * (~40,000 free geocodes per month). Cache aggressively — we store results
 * on the row that needed them, never on demand.
 */

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

function getKey(): string | null {
  return (
    process.env.GOOGLE_GEOCODING_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    null
  );
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = getKey();
  if (!key) {
    console.warn("[geocoding] no GOOGLE_GEOCODING_API_KEY or GOOGLE_PLACES_API_KEY set");
    return null;
  }

  const trimmed = address.trim();
  if (!trimmed) return null;

  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  u.searchParams.set("address", trimmed);
  u.searchParams.set("key", key);

  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[geocoding] HTTP ${res.status} for "${trimmed}"`);
      return null;
    }
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };

    if (data.status !== "OK" || data.results.length === 0) {
      // ZERO_RESULTS, OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, etc.
      console.warn(
        `[geocoding] ${data.status} for "${trimmed}"${data.error_message ? `: ${data.error_message}` : ""}`
      );
      return null;
    }

    const top = data.results[0];
    return {
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      formattedAddress: top.formatted_address,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn(`[geocoding] fetch threw for "${trimmed}": ${msg}`);
    return null;
  }
}

// ─── Geographic math (haversine + bounding box) ──────────────────────────────

const EARTH_RADIUS_MILES = 3958.756;
const MILES_PER_LAT_DEGREE = 69.0; // ~constant
const RADIANS = Math.PI / 180;

/** Great-circle distance in miles between two lat/lng pairs. */
export function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dLat = (bLat - aLat) * RADIANS;
  const dLng = (bLng - aLng) * RADIANS;
  const lat1 = aLat * RADIANS;
  const lat2 = bLat * RADIANS;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * Bounding box for a point + radius. Returned values are inclusive bounds
 * suitable for `lat BETWEEN minLat AND maxLat AND lng BETWEEN minLng AND
 * maxLng`. The box is a coarse pre-filter — apply haversine afterwards to
 * get exact membership and distance ordering.
 */
export function radiusBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMiles / MILES_PER_LAT_DEGREE;
  const lngDelta =
    radiusMiles / (MILES_PER_LAT_DEGREE * Math.cos(centerLat * RADIANS));
  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta,
  };
}
