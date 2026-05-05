// One-shot: pick Unsplash images for the in-app empty states + mood-board hero.
// Triggers Unsplash's required download_location ping per asset and prints a
// JSON block we paste into src/lib/empty-state-images.ts.
//
// Run with:  node scripts/fetch-empty-state-images.mjs

const UNSPLASH_KEY = "y264U7AcuUbI9tFhwj-4t7_lmOL53apj9aLa86pgP9g";
const UTM_SOURCE = "eydn-app";

// Slot → search query. Kept short and editorial — heavy on tone, light on
// "white dress" cliché. Each slot is one image; we'll pick the top result that
// has both a landscape orientation and a person-free composition where useful.
const SLOTS = [
  { key: "tasks_empty",      query: "open notebook desk pen calm" },
  { key: "guests_empty",     query: "wedding place card calligraphy" },
  { key: "vendors_empty",    query: "wedding florist hands arrangement" },
  { key: "party_empty",      query: "friends laughing soft light" },
  { key: "moodboard_intro",  query: "fabric swatches color palette flatlay" },
];

async function searchUnsplash(query) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("orientation", "landscape");
  u.searchParams.set("content_filter", "high");
  u.searchParams.set("per_page", "5");
  const res = await fetch(u, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.results;
}

async function triggerDownload(downloadLocation) {
  const res = await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
  if (!res.ok) console.warn(`  download trigger returned ${res.status} (non-fatal)`);
}

function buildAttribution(photo) {
  const photographerUrl = `${photo.user.links.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`;
  const unsplashUrl = `https://unsplash.com/?utm_source=${UTM_SOURCE}&utm_medium=referral`;
  return {
    photographer: photo.user.name,
    photographerUrl,
    unsplashUrl,
  };
}

(async () => {
  const out = {};
  for (const { key, query } of SLOTS) {
    console.log(`\n→ ${key}`);
    console.log(`  query: ${query}`);
    const results = await searchUnsplash(query);
    if (results.length === 0) {
      console.log("  no results — skipping");
      continue;
    }
    const photo = results[0];
    console.log(`  picked: ${photo.id} by ${photo.user.name}`);
    console.log(`  alt: ${photo.alt_description ?? "(none)"}`);

    await triggerDownload(photo.links.download_location);

    out[key] = {
      url: photo.urls.regular, // ~1080w
      thumb: photo.urls.small, // ~400w, used for empty-state thumb
      alt: photo.alt_description || query,
      unsplash_id: photo.id,
      ...buildAttribution(photo),
    };
  }
  console.log("\n--- copy into src/lib/empty-state-images.ts ---\n");
  console.log(JSON.stringify(out, null, 2));
})();
