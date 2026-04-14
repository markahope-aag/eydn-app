import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, isValidEmail } from "@/lib/validation";
import { logActivity } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";
import type { Database } from "@/lib/supabase/types";

const MAX_BULK_INSERT = 500;

type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];

type BulkGuestInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  plus_one?: boolean;
  role?: string | null;
  group_name?: string | null;
  meal_preference?: string | null;
};

/**
 * POST /api/guests/bulk — insert many guests in a single round trip.
 * Used by the contacts-import and CSV flows so the client doesn't
 * fire one request per row. Accepts up to 500 rows.
 */
export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;

  const rawGuests = (parsed as { guests?: unknown }).guests;
  if (!Array.isArray(rawGuests)) {
    return NextResponse.json({ error: "guests must be an array" }, { status: 400 });
  }
  if (rawGuests.length === 0) {
    return NextResponse.json({ error: "guests array is empty" }, { status: 400 });
  }
  if (rawGuests.length > MAX_BULK_INSERT) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BULK_INSERT} guests per request` },
      { status: 400 }
    );
  }

  // Shape-check every row and drop invalid ones up front.
  const rows: GuestInsert[] = [];
  const skipped: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < rawGuests.length; i++) {
    const g = rawGuests[i] as BulkGuestInput | null;
    if (!g || typeof g !== "object") {
      skipped.push({ index: i, reason: "not an object" });
      continue;
    }
    if (!g.name || typeof g.name !== "string" || !g.name.trim()) {
      skipped.push({ index: i, reason: "missing name" });
      continue;
    }
    if (g.email && !isValidEmail(g.email)) {
      skipped.push({ index: i, reason: "invalid email" });
      continue;
    }
    rows.push({
      wedding_id: wedding.id,
      name: g.name.trim(),
      email: g.email?.trim() || null,
      phone: g.phone?.trim() || null,
      plus_one: g.plus_one ?? false,
      role: g.role || null,
      group_name: g.group_name || null,
      meal_preference: g.meal_preference || null,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid guests in request", skipped },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.from("guests").insert(rows).select();
  const err = supabaseError(error, "guests");
  if (err) return err;

  const inserted = data || [];
  logActivity(supabase, {
    weddingId: wedding.id,
    userId,
    action: "create",
    entityType: "guests",
    entityId: `bulk_${Date.now()}`,
    entityName: `${inserted.length} guests (bulk import)`,
  });

  return NextResponse.json({
    inserted: inserted.length,
    skipped: skipped.length,
    skippedDetails: skipped,
    guests: inserted,
  }, { status: 201 });
}
