// One-shot: pick Unsplash covers for two new blog posts (Planning Checklist
// + Day-Of Timeline Template). Triggers Unsplash's required download_location
// ping per asset and prints JSON we drop into the migration.

const UNSPLASH_KEY = "y264U7AcuUbI9tFhwj-4t7_lmOL53apj9aLa86pgP9g";
const UTM_SOURCE = "eydn-blog";

const POSTS = [
  { slug: "wedding-planning-checklist-engagement-to-day-of", query: "wedding planning notebook timeline" },
  { slug: "day-of-wedding-timeline-template", query: "wedding day schedule clock morning" },
];

async function searchUnsplash(query) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("orientation", "landscape");
  u.searchParams.set("content_filter", "high");
  u.searchParams.set("per_page", "5");
  const res = await fetch(u, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`);
  return (await res.json()).results;
}

async function triggerDownload(loc) {
  await fetch(loc, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }).catch(() => {});
}

(async () => {
  for (const { slug, query } of POSTS) {
    console.log(`\n→ ${slug}`);
    console.log(`  query: ${query}`);
    const r = await searchUnsplash(query);
    if (!r.length) { console.log("  no results"); continue; }
    const p = r[0];
    console.log(`  picked: ${p.id} by ${p.user.name} — ${p.alt_description ?? ""}`);
    await triggerDownload(p.links.download_location);
    const photographerUrl = `${p.user.links.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`;
    const unsplashUrl = `https://unsplash.com/?utm_source=${UTM_SOURCE}&utm_medium=referral`;
    console.log("  cover_image:", p.urls.regular);
    console.log("  attribution:", `Photo by [${p.user.name}](${photographerUrl}) on [Unsplash](${unsplashUrl})`);
    console.log("  unsplash_id:", p.id);
  }
})();
