// One-shot: pick Unsplash covers for the 5 blog posts that are missing one,
// trigger Unsplash's download-tracking endpoint (required by API guidelines),
// and PATCH the blog_posts rows. Reads SUPABASE creds from .env.local.
//
// Run with:  node scripts/backfill-blog-covers.mjs
// Idempotent: only updates rows where cover_image IS NULL.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const UNSPLASH_KEY = "y264U7AcuUbI9tFhwj-4t7_lmOL53apj9aLa86pgP9g";
const UTM_SOURCE = "eydn-blog";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

// Hand-picked search queries per post — generic enough to get good editorial
// stock without leaning on cliche white-dress photos. We keep them tight so
// the top Unsplash result is usually on-topic.
const POSTS = [
  { slug: "wedding-budget-breakdown-2026", query: "wedding rings money calculator", orientation: "landscape" },
  { slug: "vendor-outreach-email-templates", query: "wedding florist arrangement", orientation: "landscape" },
  { slug: "wedding-planning-timeline-12-months", query: "wedding planning calendar", orientation: "landscape" },
  { slug: "seating-chart-tips-stress-free", query: "wedding reception table setting", orientation: "landscape" },
  { slug: "what-to-include-day-of-binder", query: "wedding planner notebook", orientation: "landscape" },
];

async function searchUnsplash(query, orientation) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("orientation", orientation);
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
  // Unsplash API guideline #1: hit download_location whenever a photo is "used"
  // (set as a cover, embedded in a published asset, etc). Skipping this is the
  // most common reason apps get their API access revoked.
  const res = await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
  if (!res.ok) {
    console.warn(`  download trigger returned ${res.status} (non-fatal)`);
  }
}

function buildAttribution(photo) {
  // utm-tagged credit per Unsplash's referral requirement.
  const photographerUrl = `${photo.user.links.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`;
  const unsplashUrl = `https://unsplash.com/?utm_source=${UTM_SOURCE}&utm_medium=referral`;
  return `Photo by [${photo.user.name}](${photographerUrl}) on [Unsplash](${unsplashUrl})`;
}

async function patchPost(slug, coverImage, attribution, photoId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&cover_image=is.null`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        cover_image: coverImage,
        cover_image_attribution: attribution,
        cover_image_unsplash_id: photoId,
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH failed: ${res.status} ${txt}`);
  }
  const rows = await res.json();
  return rows.length;
}

async function patchPostMinimal(slug, coverImage) {
  // Fallback when the optional attribution columns don't exist yet.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&cover_image=is.null`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ cover_image: coverImage }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH (minimal) failed: ${res.status} ${txt}`);
  }
  const rows = await res.json();
  return rows.length;
}

(async () => {
  for (const { slug, query, orientation } of POSTS) {
    console.log(`\n→ ${slug}`);
    console.log(`  query: ${query}`);
    const results = await searchUnsplash(query, orientation);
    if (results.length === 0) {
      console.log("  no results — skipping");
      continue;
    }
    const photo = results[0];
    const coverUrl = photo.urls.regular; // ~1080px wide, good for blog cards
    const attribution = buildAttribution(photo);
    console.log(`  picked: ${photo.id} by ${photo.user.name}`);
    console.log(`  url: ${coverUrl}`);

    await triggerDownload(photo.links.download_location);

    let updated;
    try {
      updated = await patchPost(slug, coverUrl, attribution, photo.id);
    } catch (err) {
      // If the optional columns don't exist, fall back to setting just the URL.
      if (String(err.message).includes("column") || String(err.message).includes("schema")) {
        console.log("  attribution columns missing — saving cover_image only");
        updated = await patchPostMinimal(slug, coverUrl);
      } else {
        throw err;
      }
    }

    console.log(updated > 0 ? "  ✓ updated" : "  (already had a cover, skipped)");
  }
  console.log("\nDone.");
})();
