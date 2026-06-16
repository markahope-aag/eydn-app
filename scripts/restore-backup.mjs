// Restore wedding data from an R2 (or local file) backup into Supabase.
//
// Backups come in two shapes, both handled here:
//   1. Daily full backup  (backups/eydn-backup-YYYY-MM-DD.json)
//      { weddingCount, weddings: [ { weddingId, data: { wedding, guests, ... } } ] }
//   2. Sunset final backup (sunset/<weddingId>-YYYY-MM-DD.json)
//      { weddingId, type: "sunset-final-backup", data: { guests, ... } }   // no wedding row
//
// Rows are UPSERTED by primary key (id), so a restore is idempotent and safe to
// re-run. Tables are written parent-first so foreign keys resolve.
//
// Reads creds from .env.local (run `vercel env pull .env.local` first to get the
// R2_* and SUPABASE_SERVICE_ROLE_KEY values):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  (for --source r2)
//
// Usage:
//   node scripts/restore-backup.mjs --list
//   node scripts/restore-backup.mjs --source r2 --key backups/eydn-backup-2026-06-16.json [--wedding <id>] [--dry-run]
//   node scripts/restore-backup.mjs --source file --file ./backup.json [--wedding <id>] [--dry-run]

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// ---- env ----
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---- args ----
// Supports both --flag=value and --flag value (space-separated).
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (!m) continue;
  const name = m[1];
  if (m[2] !== undefined) {
    args[name] = m[2];
  } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
    args[name] = argv[++i];
  } else {
    args[name] = true;
  }
}

const DRY_RUN = Boolean(args["dry-run"]);
const WEDDING_FILTER = typeof args.wedding === "string" ? args.wedding : null;

function r2Client() {
  for (const k of ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
    if (!env[k] && !process.env[k]) {
      console.error(`Missing ${k} (run: vercel env pull .env.local)`);
      process.exit(1);
    }
  }
  return {
    bucket: env.R2_BUCKET || process.env.R2_BUCKET,
    client: new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT || process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
      },
    }),
  };
}

async function listBackups() {
  const { client, bucket } = r2Client();
  for (const prefix of ["backups/", "sunset/"]) {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const items = (res.Contents || []).sort((a, b) => (a.Key < b.Key ? 1 : -1));
    console.log(`\n${prefix} (${items.length})`);
    for (const o of items) {
      console.log(`  ${o.Key}  ${(o.Size / 1024).toFixed(1)} KB  ${o.LastModified?.toISOString() ?? ""}`);
    }
  }
}

async function loadBackup() {
  if (args.source === "file") {
    if (typeof args.file !== "string") {
      console.error("--source file requires --file <path>");
      process.exit(1);
    }
    return JSON.parse(readFileSync(args.file, "utf8"));
  }
  // default: r2
  if (typeof args.key !== "string") {
    console.error("--source r2 requires --key <r2 key> (use --list to see keys)");
    process.exit(1);
  }
  const { client, bucket } = r2Client();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: args.key }));
  return JSON.parse(await res.Body.transformToString());
}

// dataKey -> [table, isSingleObject]. Order matters: parents before children.
const PLAN = [
  ["wedding", "weddings", true],
  ["guests", "guests", false],
  ["vendors", "vendors", false],
  ["tasks", "tasks", false],
  ["expenses", "expenses", false],
  ["weddingParty", "wedding_party", false],
  ["ceremonyPositions", "ceremony_positions", false],
  ["chatMessages", "chat_messages", false],
  ["moodBoard", "mood_board_items", false],
  ["registryLinks", "registry_links", false],
  ["collaborators", "wedding_collaborators", false],
  ["activityLog", "activity_log", false],
  ["attachments", "attachments", false],
  ["seatingTables", "seating_tables", false],
  ["seatAssignments", "seat_assignments", false],
  ["questionnaireResponses", "questionnaire_responses", true],
  ["dayOfPlan", "day_of_plans", true],
];

// Normalize either backup shape into an array of { weddingId, data }.
function toDatasets(backup) {
  if (Array.isArray(backup.weddings)) {
    return backup.weddings.map((w) => ({ weddingId: w.weddingId, data: w.data }));
  }
  if (backup.weddingId && backup.data) {
    return [{ weddingId: backup.weddingId, data: backup.data }];
  }
  console.error("Unrecognized backup format (expected a daily full backup or a sunset backup).");
  process.exit(1);
}

// Strip embedded relations that aren't real columns (e.g. the seating_tables
// join carried on seat_assignments rows).
function cleanRow(table, row) {
  if (table === "seat_assignments") {
    const { seating_tables, ...rest } = row;
    void seating_tables;
    return rest;
  }
  return row;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function restoreDataset(supabase, { weddingId, data }) {
  console.log(`\nWedding ${weddingId}`);
  let totalRows = 0;

  for (const [key, table, single] of PLAN) {
    const value = data[key];
    if (value == null) continue;
    const rows = (single ? [value] : value).map((r) => cleanRow(table, r)).filter(Boolean);
    if (rows.length === 0) continue;
    totalRows += rows.length;

    if (DRY_RUN) {
      console.log(`  [dry-run] ${table}: ${rows.length} rows`);
      continue;
    }

    let written = 0;
    for (const batch of chunk(rows, 500)) {
      const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
      if (error) {
        console.error(`  ✗ ${table}: ${error.message}`);
        break;
      }
      written += batch.length;
    }
    if (written) console.log(`  ✓ ${table}: ${written} rows`);
  }

  return totalRows;
}

async function main() {
  if (args.list) {
    await listBackups();
    return;
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const backup = await loadBackup();
  let datasets = toDatasets(backup);
  if (WEDDING_FILTER) datasets = datasets.filter((d) => d.weddingId === WEDDING_FILTER);

  if (datasets.length === 0) {
    console.error(WEDDING_FILTER ? `No wedding ${WEDDING_FILTER} in this backup.` : "Backup contains no weddings.");
    process.exit(1);
  }

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Restoring ${datasets.length} wedding(s) from ${
      args.source === "file" ? args.file : args.key
    }`
  );

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let grand = 0;
  for (const ds of datasets) grand += await restoreDataset(supabase, ds);

  console.log(`\n${DRY_RUN ? "[DRY RUN] would restore" : "Restored"} ${grand} rows across ${datasets.length} wedding(s).`);
}

main().catch((e) => {
  console.error("Restore failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
