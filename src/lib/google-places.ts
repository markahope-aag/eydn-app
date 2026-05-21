/**
 * Google Places API (New) integration for vendor enrichment.
 * Fetches business photos, reviews, ratings, and contact info.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const BASE_URL = "https://places.googleapis.com/v1";

export type PlaceData = {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  nationalPhoneNumber: string | null;
  googleMapsUri: string | null;
  photoUrl: string | null;
  businessStatus: string | null;
  editorialSummary: string | null;
  reviews: Array<{
    authorName: string;
    rating: number;
    text: string;
    relativeTime: string;
  }>;
};

/** Reduce a URL or bare domain to a comparable host (lowercase, no www). */
function domainOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Search for a business by name and optional location.
 * Returns the best match's place ID. When a website is supplied, the
 * result whose domain matches it is preferred over Google's top text
 * match — this stops a different business being pulled in by accident.
 */
export async function searchPlace(
  query: string,
  location?: string,
  website?: string
): Promise<{ placeId: string; name: string } | null> {
  if (!API_KEY) return null;

  const searchQuery = location ? `${query} ${location}` : query;

  try {
    const res = await fetch(`${BASE_URL}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.websiteUri",
      },
      body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 5 }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const places: Array<{
      id: string;
      displayName?: { text?: string };
      websiteUri?: string;
    }> = data.places || [];
    if (places.length === 0) return null;

    // Prefer the candidate whose website domain matches the one the user
    // entered; otherwise fall back to Google's top text match.
    const wantedDomain = domainOf(website);
    const chosen =
      (wantedDomain && places.find((p) => domainOf(p.websiteUri) === wantedDomain)) ||
      places[0];

    return {
      placeId: chosen.id,
      name: chosen.displayName?.text || query,
    };
  } catch {
    return null;
  }
}

/**
 * Get detailed place data by place ID.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceData | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(`${BASE_URL}/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "rating",
          "userRatingCount",
          "websiteUri",
          "nationalPhoneNumber",
          "googleMapsUri",
          "photos",
          "businessStatus",
          "editorialSummary",
          "reviews",
        ].join(","),
      },
    });

    if (!res.ok) return null;
    const place = await res.json();

    // Store photo reference — proxied through /api/places-photo to avoid exposing API key
    let photoUrl: string | null = null;
    if (place.photos?.[0]?.name) {
      photoUrl = `/api/places-photo?ref=${encodeURIComponent(place.photos[0].name)}`;
    }

    return {
      placeId: place.id,
      name: place.displayName?.text || "",
      formattedAddress: place.formattedAddress || null,
      rating: place.rating || null,
      userRatingCount: place.userRatingCount || null,
      websiteUri: place.websiteUri || null,
      nationalPhoneNumber: place.nationalPhoneNumber || null,
      googleMapsUri: place.googleMapsUri || null,
      photoUrl,
      businessStatus: place.businessStatus || null,
      editorialSummary: place.editorialSummary?.text || null,
      reviews: (place.reviews || []).slice(0, 3).map((r: Record<string, unknown>) => ({
        authorName: (r.authorAttribution as Record<string, unknown>)?.displayName || "Anonymous",
        rating: r.rating || 0,
        text: (r.text as Record<string, unknown>)?.text || "",
        relativeTime: r.relativePublishTimeDescription || "",
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Search + get details in one call. Caches result shape for DB storage.
 */
export async function enrichVendor(
  vendorName: string,
  vendorCategory?: string,
  location?: string,
  website?: string
): Promise<PlaceData | null> {
  const query = vendorCategory
    ? `${vendorName} ${vendorCategory}`
    : vendorName;

  const searchResult = await searchPlace(query, location, website);
  if (!searchResult) return null;

  return getPlaceDetails(searchResult.placeId);
}
