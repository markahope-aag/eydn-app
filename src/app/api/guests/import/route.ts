import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

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

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name");
  const emailIdx = headers.findIndex((h) => h === "email");
  const groupIdx = headers.findIndex((h) => h === "group" || h === "group_name");

  if (nameIdx === -1) {
    return NextResponse.json({ error: "CSV must have a 'name' column" }, { status: 400 });
  }

  const guests = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: guests.length }, { status: 201 });
}
