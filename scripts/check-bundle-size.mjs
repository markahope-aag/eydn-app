#!/usr/bin/env node
// Fails if the client JS shared by every route grows past the budget.
// Run after `next build`. Reads .next/build-manifest.json, gzips each
// rootMainFile on disk, sums the sizes, compares to BUDGET_GZIP_KIB.
//
// Current baseline (May 2026): ~257 KiB gzip after the Next 16 / Sentry 10
// / Vercel Analytics 2 upgrades. Budget set with headroom but tight enough
// that adding a large dep is a conscious choice — bump the budget in the
// same PR so reviewers see the regression.
//
// Three bands:
//   < 90% used  → OK
//   90-100%     → WARNING — printed loudly, written to step summary, but
//                  exit 0 so the build still passes
//   > 100%      → FAIL — exit 1

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BUDGET_GZIP_KIB = 280;
const WARN_PCT = 90;

const manifestPath = ".next/build-manifest.json";
if (!fs.existsSync(manifestPath)) {
  console.error(`bundle-size: ${manifestPath} missing — run 'next build' first.`);
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const files = manifest.rootMainFiles ?? [];
if (files.length === 0) {
  console.error("bundle-size: rootMainFiles is empty — manifest format changed?");
  process.exit(2);
}

let totalRaw = 0;
let totalGz = 0;
const rows = [];
for (const rel of files) {
  const abs = path.join(".next", rel);
  const buf = fs.readFileSync(abs);
  const gz = zlib.gzipSync(buf).length;
  totalRaw += buf.length;
  totalGz += gz;
  rows.push({ file: rel, raw: buf.length, gz });
}

const totalGzKiB = totalGz / 1024;
const totalRawKiB = totalRaw / 1024;
const pctNum = (totalGzKiB / BUDGET_GZIP_KIB) * 100;
const pct = pctNum.toFixed(1);

const overBudget = totalGzKiB > BUDGET_GZIP_KIB;
const inWarnBand = !overBudget && pctNum >= WARN_PCT;

const sortedRows = rows.sort((a, b) => b.gz - a.gz);

console.log("Per-file (largest first):");
for (const r of sortedRows.slice(0, 10)) {
  console.log(`  ${(r.gz / 1024).toFixed(1).padStart(6)} KiB gz  ${r.file}`);
}
console.log("");
console.log(`Root chunks total: ${totalRawKiB.toFixed(1)} KiB raw / ${totalGzKiB.toFixed(1)} KiB gzip`);
console.log(`Budget:            ${BUDGET_GZIP_KIB.toFixed(1)} KiB gzip  (${pct}% used)`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const statusLine = overBudget
    ? `❌ **${totalGzKiB.toFixed(1)} KiB / ${BUDGET_GZIP_KIB} KiB budget** — OVER by ${(totalGzKiB - BUDGET_GZIP_KIB).toFixed(1)} KiB (${pct}%)`
    : inWarnBand
      ? `⚠️ **${totalGzKiB.toFixed(1)} KiB / ${BUDGET_GZIP_KIB} KiB budget** — ${pct}% used, approaching the cap`
      : `✅ **${totalGzKiB.toFixed(1)} KiB / ${BUDGET_GZIP_KIB} KiB budget** (${pct}% used)`;

  // Top 5 chunks help diagnose surprise growth at a glance.
  const topRows = sortedRows.slice(0, 5).map((r) =>
    `| ${(r.gz / 1024).toFixed(1)} KiB | \`${r.file}\` |`
  ).join("\n");

  const md = [
    "## Bundle size (root chunks, gzip)",
    "",
    statusLine,
    "",
    inWarnBand
      ? "Next regression could break the build. Inspect the biggest chunks before adding new client deps."
      : "",
    "",
    "| Size | Chunk |",
    "|---|---|",
    topRows,
    "",
  ].filter(Boolean).join("\n");
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (overBudget) {
  console.error(`\n❌ Over budget by ${(totalGzKiB - BUDGET_GZIP_KIB).toFixed(1)} KiB gzip.`);
  process.exit(1);
}
if (inWarnBand) {
  console.warn(`\n⚠️  ${pct}% of budget — within limit but approaching the cap (warn band starts at ${WARN_PCT}%).`);
  console.warn("    A small regression will fail the next build. Inspect the biggest chunks above before adding new client deps.");
} else {
  console.log("\n✓ Within budget.");
}
