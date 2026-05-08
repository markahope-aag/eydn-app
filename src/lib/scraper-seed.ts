import type { PlaceData } from "./google-places";

/**
 * Fire a seed write-back to the scraper's /api/vendors/seed-from-place
 * endpoint. The scraper persists the vendor for future cron pulls and
 * kicks off photo enrichment server-side.
 *
 * Fire-and-forget by design. The couple's row is already saved in Eydn
 * before we get here, so a scraper-side failure should never surface as a
 * user-visible error. Exceptions are swallowed and logged instead.
 *
 * Returns nothing on purpose — callers should NOT await the result if they
 * care about response latency. (We expose an awaitable promise anyway so
 * callers in non-request contexts, like backfill scripts, can wait if they
 * want.)
 *
 * Env vars required:
 *   SCRAPER_SEED_API_URL  Base URL of the scraper API (no trailing slash)
 *   SCRAPER_SEED_API_KEY  Shared secret matching the scraper's env
 */
export async function sendSeedToScraper(params: {
  place: PlaceData;
  category: string;
  city: string;
  state: string;
}): Promise<void> {
  const url = process.env.SCRAPER_SEED_API_URL;
  const apiKey = process.env.SCRAPER_SEED_API_KEY;
  if (!url || !apiKey) {
    // Misconfiguration is silent on purpose — surfacing it would block the
    // user's "Add Vendor" flow over an integration concern. The scraper's
    // refresh cron picks vendors up via the /api/vendors/from-place
    // suggested_vendors row anyway; the seed write-back is an enhancement,
    // not a hard dependency.
    console.warn("[scraper-seed] SCRAPER_SEED_API_URL or SCRAPER_SEED_API_KEY not configured — skipping write-back");
    return;
  }

  // Trim state to 2 letters; scraper validates this strictly.
  const state = params.state.trim().slice(0, 2).toUpperCase();
  if (state.length !== 2) {
    console.warn("[scraper-seed] state is not 2 letters, skipping write-back", { state: params.state });
    return;
  }

  // 5s timeout. The scraper's insert is fast; photos run async on their
  // side. Anything longer than 5s usually means a network hang, and the
  // user's Add-Vendor response is already waiting on this.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/vendors/seed-from-place`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        place: {
          placeId: params.place.placeId,
          name: params.place.name,
          formattedAddress: params.place.formattedAddress,
          rating: params.place.rating,
          userRatingCount: params.place.userRatingCount,
          websiteUri: params.place.websiteUri,
          nationalPhoneNumber: params.place.nationalPhoneNumber,
          googleMapsUri: params.place.googleMapsUri,
          businessStatus: params.place.businessStatus,
        },
        category: params.category,
        city: params.city,
        state,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable>");
      console.warn("[scraper-seed] write-back returned non-200", { status: res.status, body: text.slice(0, 200) });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[scraper-seed] write-back errored", { error: message });
  } finally {
    clearTimeout(timer);
  }
}
