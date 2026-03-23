import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  const guests = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[nameIdx];
    if (!name) continue;

    guests.push({
      wedding_id: wedding.id,
      name,
      email: emailIdx >= 0 ? cols[emailIdx] || null : null,
      group_name: groupIdx >= 0 ? cols[groupIdx] || null : null,
    });
  }

  if (guests.length === 0) {
    return NextResponse.json({ error: "No valid guests found in CSV" }, { status: 400 });
  }

  const { error } = await supabase.from("guests").insert(guests);

  if (error) {
    console.error("[IMPORT] Insert failed:", error.message);
    return NextResponse.json({ error: "Failed to import guests" }, { status: 500 });
  }

  return NextResponse.json({ imported: guests.length }, { status: 201 });
}
