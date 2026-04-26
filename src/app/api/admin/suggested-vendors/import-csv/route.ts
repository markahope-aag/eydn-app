import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CSV_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "",
]);

const REQUIRED_HEADERS = ["name", "category", "city", "state"] as const;
const VALID_PRICE_RANGES = new Set(["$", "$$", "$$$", "$$$$"]);

/** Strip leading characters that trigger formula execution in Excel/Sheets. */
function sanitizeCell(value: string): string {
  let s = value.trim();
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    s = s.slice(1, -1).replace(/""/g, '"');
  }
  while (s.length > 0 && "=+@-".includes(s[0])) {
    s = s.slice(1);
  }
  return s.trim();
}

/** Parse a CSV line respecting quoted fields. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map(sanitizeCell);
}

type VendorRow = {
  name: string;
  category: string;
  city: string;
  state: string;
  country?: string;
  zip?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  price_range?: string | null;
  gmb_place_id?: string | null;
  quality_score?: number | null;
};

/**
 * POST /api/admin/suggested-vendors/import-csv
 * multipart/form-data: { file: <CSV>, commit?: 'true' }
 *
 * Default is dry-run: returns a summary of what would be inserted/updated.
 * Pass commit=true to actually apply the changes.
 *
 * Required CSV headers: name, category, city, state.
 * Optional: country, zip, website, phone, email, address, description,
 *           price_range ($/$$/$$$/$$$$), gmb_place_id.
 *
 * Dedup: gmb_place_id (if present) takes priority. Otherwise dedupes on
 * (lower(name), lower(city), upper(state)) against existing rows.
 */
export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const commit = formData.get("commit") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: `CSV exceeds ${MAX_CSV_BYTES / (1024 * 1024)} MB limit` },
      { status: 413 }
    );
  }
  if (!ALLOWED_CSV_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Upload a .csv file.` },
      { status: 415 }
    );
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      return NextResponse.json(
        { error: `Missing required header: '${required}'. Required: ${REQUIRED_HEADERS.join(", ")}` },
        { status: 400 }
      );
    }
  }
  const headerIdx = (h: string) => headers.indexOf(h);

  const errors: string[] = [];
  const validRows: VendorRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const get = (h: string): string => {
      const idx = headerIdx(h);
      return idx >= 0 ? cells[idx] || "" : "";
    };

    const name = get("name");
    const category = get("category");
    const city = get("city");
    const state = get("state");

    if (!name || !category || !city || !state) {
      errors.push(`Row ${i + 1}: missing required field(s)`);
      continue;
    }

    const priceRange = get("price_range") || null;
    if (priceRange && !VALID_PRICE_RANGES.has(priceRange)) {
      errors.push(`Row ${i + 1}: invalid price_range '${priceRange}' (must be $, $$, $$$, or $$$$)`);
      continue;
    }

    const rawScore = get("quality_score");
    let quality_score: number | null = null;
    if (rawScore) {
      const parsed = Number(rawScore);
      if (!Number.isFinite(parsed)) {
        errors.push(`Row ${i + 1}: quality_score '${rawScore}' is not a number`);
        continue;
      }
      quality_score = parsed;
    }

    validRows.push({
      name,
      category,
      city,
      state: state.toUpperCase(),
      country: get("country") || "US",
      zip: get("zip") || null,
      website: get("website") || null,
      phone: get("phone") || null,
      email: get("email") || null,
      address: get("address") || null,
      description: get("description") || null,
      price_range: priceRange,
      gmb_place_id: get("gmb_place_id") || null,
      quality_score,
    });
  }

  // Dedup pass: which rows already exist?
  const placeIds = validRows.map((r) => r.gmb_place_id).filter((p): p is string => Boolean(p));
  const { data: existingByPlaceId } = placeIds.length
    ? await supabase.from("suggested_vendors").select("id, gmb_place_id").in("gmb_place_id", placeIds)
    : { data: [] };
  const existingPlaceIdSet = new Set((existingByPlaceId || []).map((r) => r.gmb_place_id as string));

  // For rows without place_id, dedup on (name, city, state) — load all existing
  // and match in JS. Cheap for typical admin batch sizes.
  const { data: existingByName } = await supabase
    .from("suggested_vendors")
    .select("id, name, city, state");
  const nameKey = (n: string, c: string, s: string) =>
    `${n.toLowerCase().trim()}|${c.toLowerCase().trim()}|${s.toUpperCase().trim()}`;
  const existingNameSet = new Set(
    (existingByName || []).map((r) => nameKey(r.name as string, r.city as string, r.state as string))
  );

  let wouldInsert = 0;
  let wouldUpdate = 0;
  for (const row of validRows) {
    if (row.gmb_place_id && existingPlaceIdSet.has(row.gmb_place_id)) {
      wouldUpdate++;
    } else if (existingNameSet.has(nameKey(row.name, row.city, row.state))) {
      wouldUpdate++;
    } else {
      wouldInsert++;
    }
  }

  const summary = {
    rowsParsed: lines.length - 1,
    rowsValid: validRows.length,
    rowsInvalid: errors.length,
    wouldInsert,
    wouldUpdate,
    errors: errors.slice(0, 50),
    preview: validRows.slice(0, 10).map((r) => ({
      name: r.name, category: r.category, city: r.city, state: r.state,
    })),
  };

  if (!commit) {
    return NextResponse.json({ dryRun: true, ...summary });
  }

  // Commit path: insert new rows, leave matched rows alone (we don't auto-overwrite
  // existing fields — admin can edit individually if they want to update copy).
  const newRows = validRows.filter((row) => {
    if (row.gmb_place_id && existingPlaceIdSet.has(row.gmb_place_id)) return false;
    if (existingNameSet.has(nameKey(row.name, row.city, row.state))) return false;
    return true;
  });

  let inserted = 0;
  if (newRows.length > 0) {
    const { error: insertError } = await supabase
      .from("suggested_vendors")
      .insert(
        newRows.map((r) => ({
          name: r.name,
          category: r.category,
          city: r.city,
          state: r.state,
          country: r.country || "US",
          zip: r.zip,
          website: r.website,
          phone: r.phone,
          email: r.email,
          address: r.address,
          description: r.description,
          price_range: r.price_range,
          gmb_place_id: r.gmb_place_id,
          quality_score: r.quality_score ?? null,
          active: true,
          featured: false,
          seed_source: "csv",
        }))
      );
    if (insertError) {
      return NextResponse.json(
        { error: `Insert failed: ${insertError.message}`, ...summary },
        { status: 500 }
      );
    }
    inserted = newRows.length;
  }

  return NextResponse.json({
    dryRun: false,
    ...summary,
    inserted,
    skippedDuplicates: validRows.length - inserted,
  });
}
