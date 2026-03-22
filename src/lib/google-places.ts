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

/**
 * Search for a business by name and optional location.
 * Returns the top match's place ID.
 */
export async function searchPlace(
  query: string,
  location?: string
): Promise<{ placeId: string; name: string } | null> {
  if (!API_KEY) return null;

  const searchQuery = location ? `${query} ${location}` : query;

  try {
    const res = await fetch(`${BASE_URL}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName",
      },
      body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      placeId: place.id,
      name: place.displayName?.text || query,
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

    // Get first photo URL if available
    let photoUrl: string | null = null;
    if (place.photos?.[0]?.name) {
      photoUrl = `${BASE_URL}/${place.photos[0].name}/media?maxWidthPx=400&key=${API_KEY}`;
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
  location?: string
): Promise<PlaceData | null> {
  const query = vendorCategory
    ? `${vendorName} ${vendorCategory}`
    : vendorName;

  const searchResult = await searchPlace(query, location);
  if (!searchResult) return null;

  return getPlaceDetails(searchResult.placeId);
}
