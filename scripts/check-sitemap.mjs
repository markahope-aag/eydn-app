#!/usr/bin/env node
/**
 * Sitemap integrity check for eydn.app.
 *
 *   node scripts/check-sitemap.mjs
 *
 * Walks src/app/**​/page.tsx, derives the expected URL paths, parses
 * src/app/sitemap.ts for the hardcoded static URL list, and fails if any
 * static route is missing from sitemap.ts and not in the explicit EXCLUDES.
 *
 * Dynamic content (blog posts from Supabase, budget-calculator share pages,
 * customer wedding websites at /w/[slug]) is not validated by this check —
 * it only catches the "shipped a static marketing page, forgot to add to
 * sitemap" failure mode.
 *
 * No TS tooling required; runs on plain Node 22.
 */
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const APP_DIR = path.join(ROOT, "src", "app");
const SITEMAP_TS = path.join(ROOT, "src", "app", "sitemap.ts");

/**
 * Public-facing routes that are INTENTIONALLY excluded from sitemap.xml.
 * If a route is removed from this list, it must be added to sitemap.ts OR the
 * page.tsx must be deleted — otherwise the check fails.
 */
const EXPLICIT_EXCLUDES = new Set([
  // Auth-gated post-signup claim page
  "/beta/claim",
  // Embeddable widget (we don't want the embed indexed)
  "/tools/wedding-budget-calculator/embed",
]);

/**
 * Directory segments we never index (auth, API, dashboard, Sentry).
 * Matches the robots.txt Disallow list.
 */
const EXCLUDE_SEGMENTS = new Set([
  "api",
  "dashboard",
  "sign-in",
  "sign-up",
  "sentry-example-page",
  "monitoring",
  "_components",
]);

async function collectRoutes() {
  const staticRoutes = [];
  const dynamicRoutes = [];

  async function walk(dir, segments) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    if (entries.some((e) => e.isFile() && e.name === "page.tsx")) {
      const urlPath = "/" + segments.filter((s) => !s.startsWith("(")).join("/");
      const normalized = urlPath.replace(/\/+$/, "") || "/";
      if (segments.some((s) => s.startsWith("["))) {
        dynamicRoutes.push(normalized);
      } else {
        staticRoutes.push(normalized);
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (EXCLUDE_SEGMENTS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), [...segments, entry.name]);
    }
  }

  await walk(APP_DIR, []);
  return { staticRoutes, dynamicRoutes };
}

async function parseSitemapStatic() {
  const src = await fs.readFile(SITEMAP_TS, "utf-8");
  const urls = new Set();

  // ${baseUrl}/foo, ${baseUrl}/foo/bar, or ${baseUrl} by itself inside `...`
  const tplRe = /\$\{baseUrl\}([^`"'\s,}]*)/g;
  let m;
  while ((m = tplRe.exec(src)) !== null) {
    urls.add(m[1].replace(/\/+$/, "") || "/");
  }

  // Bare `url: baseUrl` (the homepage entry — no template literal)
  if (/\burl:\s*baseUrl\b/.test(src)) urls.add("/");

  return urls;
}

async function main() {
  const [{ staticRoutes, dynamicRoutes }, sitemapPaths] = await Promise.all([
    collectRoutes(),
    parseSitemapStatic(),
  ]);

  const missing = staticRoutes
    .filter((p) => !sitemapPaths.has(p))
    .filter((p) => !EXPLICIT_EXCLUDES.has(p))
    .sort();

  // Any static route in EXPLICIT_EXCLUDES must still exist as a page.tsx —
  // otherwise the exclude list has rotted and should be pruned.
  const staleExcludes = Array.from(EXPLICIT_EXCLUDES).filter(
    (p) => !staticRoutes.includes(p),
  );

  let ok = true;

  if (missing.length > 0) {
    ok = false;
    console.error("FAIL: static routes present in app/ but missing from sitemap.ts:");
    for (const p of missing) console.error(`  - ${p}`);
    console.error(
      "\nAdd each to the staticPages array in src/app/sitemap.ts, OR add to " +
        "EXPLICIT_EXCLUDES in scripts/check-sitemap.mjs if intentionally omitted.",
    );
  }

  if (staleExcludes.length > 0) {
    console.error("\nWARN: EXPLICIT_EXCLUDES contains routes that no longer exist:");
    for (const p of staleExcludes) console.error(`  - ${p}`);
    console.error("Prune these from scripts/check-sitemap.mjs.");
  }

  if (ok) {
    console.log(
      `OK  ${sitemapPaths.size} hardcoded URLs in sitemap.ts | ` +
        `${staticRoutes.length} static routes in app/ | ` +
        `${dynamicRoutes.length} dynamic route prefixes | ` +
        `${EXPLICIT_EXCLUDES.size} intentional excludes`,
    );
    console.log(`Dynamic routes (blog posts, categories, etc. resolve at runtime):`);
    for (const p of dynamicRoutes.sort()) console.log(`  - ${p}`);
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("check-sitemap crashed:", err);
  process.exit(2);
});
