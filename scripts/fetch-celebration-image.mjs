// One-shot: pick a tasteful celebration photo for the post-onboarding moment.
const UNSPLASH_KEY = "y264U7AcuUbI9tFhwj-4t7_lmOL53apj9aLa86pgP9g";
const UTM_SOURCE = "eydn-app";

const QUERIES = [
  "wedding rings candlelight delicate",
  "wedding florals soft evening",
  "wedding bouquet hands twilight",
];

async function searchUnsplash(query) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("orientation", "landscape");
  u.searchParams.set("content_filter", "high");
  u.searchParams.set("per_page", "5");
  const res = await fetch(u, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) throw new Error(`Unsplash failed: ${res.status}`);
  return (await res.json()).results;
}

async function triggerDownload(loc) {
  await fetch(loc, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }).catch(() => {});
}

(async () => {
  for (const query of QUERIES) {
    console.log(`\n→ ${query}`);
    const r = await searchUnsplash(query);
    if (!r.length) { console.log("  no results"); continue; }
    const p = r[0];
    console.log(`  ${p.id} by ${p.user.name} — ${p.alt_description ?? ""}`);
    await triggerDownload(p.links.download_location);
    console.log(JSON.stringify({
      query,
      url: p.urls.regular,
      thumb: p.urls.small,
      alt: p.alt_description || query,
      unsplash_id: p.id,
      photographer: p.user.name,
      photographerUrl: `${p.user.links.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`,
      unsplashUrl: `https://unsplash.com/?utm_source=${UTM_SOURCE}&utm_medium=referral`,
    }, null, 2));
  }
})();
