// One-shot: geocode every active suggested_vendor that is missing lat/lng.
// Reads existing city/state/zip/country fields, asks Google Geocoding for a
// lat/lng, writes back via Supabase REST.
//
// Idempotent: only touches rows where lat IS NULL OR lng IS NULL.
// Throttled: 10 req/sec to stay well under Google's 50 QPS limit.
//
// Run with:  node scripts/backfill-vendor-geocodes.mjs [--limit=500]

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
const GEO_KEY = env.GOOGLE_GEOCODING_API_KEY || env.GOOGLE_PLACES_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}
if (!GEO_KEY) {
  console.error("Missing GOOGLE_GEOCODING_API_KEY (or GOOGLE_PLACES_API_KEY) in .env.local");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);
const LIMIT = Number(args.limit || 500);
const THROTTLE_MS = 100; // 10 req/sec

async function fetchVendorsToGeocode() {
  const u = new URL(`${SUPABASE_URL}/rest/v1/suggested_vendors`);
  u.searchParams.set("select", "id,name,address,city,state,zip,country");
  u.searchParams.set("active", "eq.true");
  u.searchParams.set("lat", "is.null");
  u.searchParams.set("limit", String(LIMIT));
  const res = await fetch(u, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch vendors failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function buildAddress(v) {
  const parts = [
    v.address,
    v.city,
    v.state ? `${v.state}${v.zip ? ` ${v.zip}` : ""}` : v.zip,
    v.country,
  ].filter((p) => p && String(p).trim());
  return parts.join(", ");
}

async function geocodeOne(address) {
  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  u.searchParams.set("address", address);
  u.searchParams.set("key", GEO_KEY);
  const res = await fetch(u);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) {
    console.warn(`  ${data.status}${data.error_message ? `: ${data.error_message}` : ""}`);
    return null;
  }
  const r = data.results[0];
  return { lat: r.geometry.location.lat, lng: r.geometry.location.lng };
}

async function patchVendor(id, lat, lng) {
  const u = new URL(`${SUPABASE_URL}/rest/v1/suggested_vendors`);
  u.searchParams.set("id", `eq.${id}`);
  const res = await fetch(u, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      lat,
      lng,
      geocoded_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
}

(async () => {
  const vendors = await fetchVendorsToGeocode();
  console.log(`Geocoding ${vendors.length} vendors (limit ${LIMIT})...`);
  let ok = 0;
  let skip = 0;
  for (const v of vendors) {
    const address = buildAddress(v);
    if (!address) {
      skip++;
      continue;
    }
    const result = await geocodeOne(address);
    if (result) {
      await patchVendor(v.id, result.lat, result.lng);
      ok++;
      if (ok % 50 === 0) console.log(`  ✓ ${ok} geocoded so far`);
    } else {
      skip++;
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }
  console.log(`\nDone. ${ok} geocoded, ${skip} skipped.`);
  if (vendors.length === LIMIT) {
    console.log("Hit the page limit — re-run to continue with the next batch.");
  }
})();
