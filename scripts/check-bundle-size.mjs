#!/usr/bin/env node
// Fails if the client JS shared by every route grows past the budget.
// Run after `next build`. Reads .next/build-manifest.json, gzips each
// rootMainFile on disk, sums the sizes, compares to BUDGET_GZIP_KIB.
//
// Current baseline (Apr 2026): ~253 KiB gzip. Budget set with headroom.
// If you intentionally add a large dep, bump the budget in the same PR
// so reviewers can see the regression.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BUDGET_GZIP_KIB = 280;

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
const pct = ((totalGzKiB / BUDGET_GZIP_KIB) * 100).toFixed(1);

console.log("Per-file (largest first):");
for (const r of rows.sort((a, b) => b.gz - a.gz).slice(0, 10)) {
  console.log(`  ${(r.gz / 1024).toFixed(1).padStart(6)} KiB gz  ${r.file}`);
}
console.log("");
console.log(`Root chunks total: ${totalRawKiB.toFixed(1)} KiB raw / ${totalGzKiB.toFixed(1)} KiB gzip`);
console.log(`Budget:            ${BUDGET_GZIP_KIB.toFixed(1)} KiB gzip  (${pct}% used)`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    "## Bundle size (root chunks, gzip)",
    "",
    `**${totalGzKiB.toFixed(1)} KiB / ${BUDGET_GZIP_KIB} KiB budget** (${pct}% used)`,
    "",
  ].join("\n");
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (totalGzKiB > BUDGET_GZIP_KIB) {
  console.error(`\n❌ Over budget by ${(totalGzKiB - BUDGET_GZIP_KIB).toFixed(1)} KiB gzip.`);
  process.exit(1);
}
console.log("\n✓ Within budget.");
