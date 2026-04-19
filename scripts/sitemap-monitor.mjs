#!/usr/bin/env node
/**
 * Sitemap monitor + BWT auto-submit for eydn.app.
 *
 *   node scripts/sitemap-monitor.mjs          # check + submit new URLs
 *   node scripts/sitemap-monitor.mjs --dry    # check only, no submissions
 *
 * Fetches the live sitemap, alerts if the URL count dropped significantly
 * since the last run, and submits any newly-added URLs to Bing Webmaster
 * Tools. Persists state in scripts/.sitemap-state.json (committed).
 *
 * Requires env:
 *   BWT_API_KEY  — Bing Webmaster Tools API key
 */
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const STATE_PATH = path.join(ROOT, "scripts", ".sitemap-state.json");
const SITE = "https://eydn.app/";
const SITEMAP_URL = "https://eydn.app/sitemap.xml";
const DRY = process.argv.includes("--dry");
const SHRINK_THRESHOLD = 0.1;

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, "utf-8"));
  } catch {
    return null;
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

async function fetchSitemap() {
  const resp = await fetch(SITEMAP_URL, {
    headers: { "User-Agent": "EydnMonitor/1.0" },
  });
  if (!resp.ok) throw new Error(`sitemap fetch failed: ${resp.status}`);
  const xml = await resp.text();
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].trim()).sort();
}

async function submitToBwt(urls) {
  const apiKey = process.env.BWT_API_KEY;
  if (!apiKey) {
    console.log("BWT_API_KEY not set — skipping submission");
    return;
  }
  const resp = await fetch(
    `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl: SITE, urlList: urls }),
    },
  );
  const body = await resp.text();
  console.log(`BWT SubmitUrlBatch: HTTP ${resp.status}  ${body.slice(0, 200)}`);
  if (!resp.ok) throw new Error(`BWT submission failed: ${resp.status}`);
}

async function main() {
  const liveUrls = await fetchSitemap();
  const liveSet = new Set(liveUrls);
  const prev = await loadState();

  console.log(`Sitemap: ${liveUrls.length} URLs`);

  if (prev) {
    const prevSet = new Set(prev.urls);
    const added = liveUrls.filter((u) => !prevSet.has(u));
    const removed = prev.urls.filter((u) => !liveSet.has(u));
    const shrinkRatio = prev.lastCount > 0
      ? (prev.lastCount - liveUrls.length) / prev.lastCount
      : 0;

    console.log(`Previous run: ${prev.lastCount} URLs (${prev.lastRun})`);
    console.log(`Added: ${added.length}  Removed: ${removed.length}`);

    if (shrinkRatio > SHRINK_THRESHOLD) {
      console.error(
        `ALERT: sitemap shrank by ${(shrinkRatio * 100).toFixed(1)}% ` +
          `(${prev.lastCount} → ${liveUrls.length}). Investigate before submitting.`,
      );
      process.exit(1);
    }

    if (added.length > 0) {
      console.log("New URLs:");
      for (const u of added) console.log(`  + ${u}`);
      if (!DRY) await submitToBwt(added);
      else console.log("(dry run — not submitted)");
    }
  } else {
    console.log("First run — submitting all URLs to BWT");
    if (!DRY) await submitToBwt(liveUrls);
  }

  await saveState({
    urls: liveUrls,
    lastRun: new Date().toISOString(),
    lastCount: liveUrls.length,
  });
  console.log("State saved.");
}

main().catch((err) => {
  console.error("monitor crashed:", err);
  process.exit(2);
});
