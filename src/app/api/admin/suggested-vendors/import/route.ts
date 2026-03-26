import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeParseJSON, isParseError } from "@/lib/validation";
import {
  normalizeCategory,
  normalizeState,
  normalizeCity,
  normalizePhone,
  normalizeWebsite,
  normalizePriceRange,
  normalizeEmail,
} from "@/lib/vendors/normalize";

/**
 * POST /api/admin/suggested-vendors/import
 *
 * Imports vendors from a remote Supabase database into the local
 * suggested_vendors table. Requires admin role.
 *
 * Body:
 *   supabase_url: string    — Remote Supabase project URL
 *   supabase_key: string    — Remote Supabase service role key
 *   table_name: string      — Table to read from (default: "vendors")
 *   column_map?: object     — Optional mapping from remote columns to local columns
 *   filters?: object        — Optional filters (e.g. { status: "active" })
 *   dry_run?: boolean       — If true, returns preview without inserting
 */

type ColumnMap = {
  name?: string;
  category?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  price_range?: string;
};

const DEFAULT_COLUMN_MAP: ColumnMap = {
  name: "name",
  category: "category",
  description: "description",
  website: "website",
  phone: "phone",
  email: "email",
  address: "address",
  city: "city",
  state: "state",
  zip: "zip",
  country: "country",
  price_range: "price_range",
};

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase: localSupabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const remoteUrl = body.supabase_url as string;
  const remoteKey = body.supabase_key as string;
  const tableName = (body.table_name as string) || "vendors";
  const columnMap = { ...DEFAULT_COLUMN_MAP, ...(body.column_map as ColumnMap || {}) };
  const filters = (body.filters as Record<string, string>) || {};
  const dryRun = (body.dry_run as boolean) || false;

  if (!remoteUrl || !remoteKey) {
    return NextResponse.json(
      { error: "supabase_url and supabase_key are required" },
      { status: 400 }
    );
  }

  // Connect to the remote Supabase project
  let remoteSupabase;
  try {
    remoteSupabase = createClient(remoteUrl, remoteKey);
  } catch {
    return NextResponse.json(
      { error: "Couldn't connect to remote database. Check the URL and key." },
      { status: 400 }
    );
  }

  // Build the select columns from the column map
  const remoteColumns = Object.values(columnMap).filter(Boolean).join(", ");

  // Query the remote table
  let query = remoteSupabase.from(tableName).select(remoteColumns);

  // Apply any filters
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data: remoteData, error: remoteError } = await query.limit(5000);

  if (remoteError) {
    return NextResponse.json(
      { error: `Remote query failed: ${remoteError.message}` },
      { status: 400 }
    );
  }

  if (!remoteData || remoteData.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, message: "No records found in remote table." });
  }

  // Map and normalize remote rows to local schema
  const rows = remoteData as unknown as Record<string, unknown>[];
  const get = (row: Record<string, unknown>, key: string) => {
    const val = row[key];
    return val != null ? String(val).trim() : "";
  };

  const mapped = rows.map((row) => {
    const rawCategory = get(row, columnMap.category || "category");
    const rawState = get(row, columnMap.state || "state");
    const rawCity = get(row, columnMap.city || "city");
    const rawPhone = get(row, columnMap.phone || "phone");
    const rawWebsite = get(row, columnMap.website || "website");
    const rawEmail = get(row, columnMap.email || "email");
    const rawPriceRange = get(row, columnMap.price_range || "price_range");

    return {
      name: get(row, columnMap.name || "name"),
      category: normalizeCategory(rawCategory) || rawCategory,
      description: get(row, columnMap.description || "description") || null,
      website: rawWebsite ? normalizeWebsite(rawWebsite) : null,
      phone: rawPhone ? normalizePhone(rawPhone) : null,
      email: rawEmail ? normalizeEmail(rawEmail) : null,
      address: get(row, columnMap.address || "address") || null,
      city: rawCity ? normalizeCity(rawCity) : "",
      state: normalizeState(rawState) || rawState.toUpperCase().slice(0, 2),
      zip: get(row, columnMap.zip || "zip") || null,
      country: get(row, columnMap.country || "country") || "US",
      price_range: normalizePriceRange(rawPriceRange),
      featured: false,
      active: true,
    };
  });

  // Validate: skip rows missing required fields or with unresolvable state
  const valid = mapped.filter((v) => v.name && v.category && v.city && v.state && v.state.length === 2);
  const skipped = mapped.length - valid.length;

  // Deduplicate against existing vendors (by name + city + state)
  const { data: existing } = await localSupabase
    .from("suggested_vendors")
    .select("name, city, state");

  const existingSet = new Set(
    (existing || []).map((e: { name: string; city: string; state: string }) =>
      `${e.name.toLowerCase()}|${e.city.toLowerCase()}|${e.state.toLowerCase()}`
    )
  );

  const newVendors = valid.filter(
    (v) => !existingSet.has(`${v.name.toLowerCase()}|${v.city.toLowerCase()}|${v.state.toLowerCase()}`)
  );
  const duplicates = valid.length - newVendors.length;

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      total_remote: remoteData.length,
      valid: valid.length,
      skipped_invalid: skipped,
      duplicates,
      would_import: newVendors.length,
      preview: newVendors.slice(0, 10),
    });
  }

  if (newVendors.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped_invalid: skipped,
      duplicates,
      message: "All vendors already exist in the directory.",
    });
  }

  // Stamp import metadata on every record
  const importedAt = new Date().toISOString();
  const importSource = (body.import_source as string) || remoteUrl;
  const stamped = newVendors.map((v) => ({
    ...v,
    imported_at: importedAt,
    import_source: importSource,
  }));

  // Insert in batches of 100
  let totalInserted = 0;
  const errors: string[] = [];
  const batchSize = 100;

  for (let i = 0; i < stamped.length; i += batchSize) {
    const batch = stamped.slice(i, i + batchSize);
    const { error: insertError } = await localSupabase
      .from("suggested_vendors")
      .insert(batch);

    if (insertError) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
    } else {
      totalInserted += batch.length;
    }
  }

  return NextResponse.json({
    imported: totalInserted,
    skipped_invalid: skipped,
    duplicates,
    total_remote: remoteData.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
