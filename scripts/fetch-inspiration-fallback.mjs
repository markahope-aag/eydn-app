// One-shot: pre-fetch a static fallback set of 8 generic wedding inspiration
// images for the Colors & Theme inspiration board. These guarantee the
// gallery has SOMETHING to show even if Unsplash's live search fails or the
// API key isn't loaded in the runtime environment.
//
// Each photo's download_location ping is fired now (counts as initial usage).
// The shipped JSON includes the track_url so a fresh ping fires every time
// a user actually saves the image.

const UNSPLASH_KEY = "y264U7AcuUbI9tFhwj-4t7_lmOL53apj9aLa86pgP9g";
const UTM_SOURCE = "eydn-app";

const QUERIES = [
  "wedding florals soft",
  "wedding table setting candlelight",
  "wedding ceremony arch",
  "bouquet bridal flowers",
  "wedding reception evening",
  "wedding centerpiece flowers",
  "elegant wedding details",
  "wedding venue romantic",
];

async function searchOne(q) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", q);
  u.searchParams.set("orientation", "portrait");
  u.searchParams.set("content_filter", "high");
  u.searchParams.set("per_page", "3");
  const res = await fetch(u, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) throw new Error(`Unsplash failed for "${q}": ${res.status}`);
  return (await res.json()).results;
}

async function pingDownload(loc) {
  await fetch(loc, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }).catch(() => {});
}

(async () => {
  const seen = new Set();
  const out = [];
  for (const q of QUERIES) {
    const results = await searchOne(q);
    for (const p of results) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      await pingDownload(p.links.download_location);
      out.push({
        id: p.id,
        url: p.urls.regular,
        thumb: p.urls.small,
        alt: p.alt_description || q,
        photographer: p.user.name,
        photographer_url: `${p.user.links.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`,
        unsplash_url: `https://unsplash.com/?utm_source=${UTM_SOURCE}&utm_medium=referral`,
        track_url: p.links.download_location,
        query: q,
      });
      if (out.length >= 8) break;
    }
    if (out.length >= 8) break;
  }
  console.log("\n--- copy into src/lib/inspiration-fallback.ts ---\n");
  console.log(JSON.stringify(out, null, 2));
})();
