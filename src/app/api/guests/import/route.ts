import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CSV_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "",
]);

/** Strip leading characters that trigger formula execution in Excel/Sheets. */
function sanitizeCell(value: string): string {
  let s = value.trim();
  // Remove wrapping quotes
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    s = s.slice(1, -1).replace(/""/g, '"');
  }
  // Strip formula-triggering prefixes
  while (s.length > 0 && "=+@-".includes(s[0])) {
    s = s.slice(1);
  }
  return s.trim();
}

// Lightweight email shape check — enough to reject obvious garbage without
// rejecting valid-but-unusual addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Human-readable summary of the first few row problems, for error/warning copy. */
function formatRowErrors(errors: { line: number; reason: string }[], max = 3): string {
  const shown = errors.slice(0, max).map((e) => `row ${e.line} (${e.reason})`).join(", ");
  const extra = errors.length > max ? ` and ${errors.length - max} more` : "";
  return shown + extra;
}

/** Parse a CSV line respecting quoted fields (handles commas inside quotes). */
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
          i++; // skip escaped quote
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

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const formData = await request.formData();
  const file = formData.get("file") as File;

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
  const lines = text.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name");
  const emailIdx = headers.findIndex((h) => h === "email");
  const groupIdx = headers.findIndex((h) => h === "group" || h === "group_name");

  if (nameIdx === -1) {
    return NextResponse.json({ error: "CSV must have a 'name' column" }, { status: 400 });
  }

  // Determine the minimum number of columns each row must have
  const requiredIndices = [nameIdx, emailIdx, groupIdx].filter((i) => i >= 0);
  const minColumns = requiredIndices.length > 0 ? Math.max(...requiredIndices) + 1 : 1;

  const guests = [];
  // `dropped` = rows that couldn't be imported at all (structural problems).
  // `cleaned` = rows imported but with bad data removed (e.g. invalid email).
  // Both are reported back with 1-based line numbers so malformed rows surface
  // as feedback instead of being silently imported or silently discarded.
  const dropped: { line: number; reason: string }[] = [];
  const cleaned: { line: number; reason: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1; // header is line 1
    const cols = parseCsvLine(lines[i]);

    if (cols.length < minColumns) {
      dropped.push({ line: lineNo, reason: "too few columns" });
      continue;
    }

    const name = cols[nameIdx];
    if (!name) {
      dropped.push({ line: lineNo, reason: "missing name" });
      continue;
    }

    let email = emailIdx >= 0 ? cols[emailIdx] || "" : "";
    if (email && !EMAIL_RE.test(email)) {
      // Don't lose the guest over a bad email — import them without it and flag it.
      cleaned.push({ line: lineNo, reason: `invalid email "${email}" — imported without it` });
      email = "";
    }

    guests.push({
      wedding_id: wedding.id,
      name,
      email: email || null,
      group_name: groupIdx >= 0 ? cols[groupIdx] || null : null,
      // Bulk-imported guests are people the couple is considering, not yet
      // invited — match the single-add UI which uses "Save for Later" rather
      // than the DB default of "Pending" (which implies an invite has gone
      // out and is awaiting a response).
      rsvp_status: "not_invited",
    });
  }

  if (guests.length === 0) {
    const detail = dropped.length ? ` Problems: ${formatRowErrors(dropped)}.` : "";
    return NextResponse.json(
      { error: `No valid guests found in CSV.${detail}`, errors: dropped },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("guests").insert(guests);

  if (error) {
    console.error("[IMPORT] Insert failed:", error.message);
    return NextResponse.json({ error: "Failed to import guests" }, { status: 500 });
  }

  const issues = [...dropped, ...cleaned].sort((a, b) => a.line - b.line);
  return NextResponse.json(
    { imported: guests.length, skipped: dropped.length, errors: issues.slice(0, 50) },
    { status: 201 }
  );
}
