import { getWeddingForUser, readOnlyError } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields, isOneOf, isValidNumber, MAX_MONETARY_AMOUNT } from "@/lib/validation";
import { notifyCollaborators } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("vendors")
    .select()
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const err = supabaseError(error, "vendors");
  if (err) return err;

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  if (result.role === "parent") return readOnlyError();
  const { wedding, supabase, userId } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["name", "category"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (body.status !== undefined && !isOneOf(body.status, ["searching", "contacted", "booked", "confirmed", "cancelled"] as const)) {
    return NextResponse.json({ error: "status must be one of: searching, contacted, booked, confirmed, cancelled" }, { status: 400 });
  }

  if (body.amount !== undefined && body.amount !== null && !isValidNumber(body.amount, 0, MAX_MONETARY_AMOUNT)) {
    return NextResponse.json({ error: `amount must be between 0 and ${MAX_MONETARY_AMOUNT.toLocaleString()}` }, { status: 400 });
  }
  if (body.amount_paid !== undefined && body.amount_paid !== null && !isValidNumber(body.amount_paid, 0, MAX_MONETARY_AMOUNT)) {
    return NextResponse.json({ error: `amount_paid must be between 0 and ${MAX_MONETARY_AMOUNT.toLocaleString()}` }, { status: 400 });
  }

  const allowed = pickFields(body, ["status", "poc_name", "poc_email", "poc_phone", "notes", "amount", "amount_paid"]);

  // When the caller is adding a vendor pulled from our public directory
  // (which is backed by Google Place data), let them carry the Google Place
  // ID and cached profile through. Without this, the vendor detail page
  // has to do a fresh text search by name+category to rehydrate the GMB
  // panel — that search frequently misses, so the panel reports "could not
  // find this business on Google" even though we had the right link a
  // moment ago.
  const gmbFields: Record<string, unknown> = {};
  if (typeof body.gmb_place_id === "string" && body.gmb_place_id) {
    gmbFields.gmb_place_id = body.gmb_place_id;
  }
  if (body.gmb_data && typeof body.gmb_data === "object") {
    gmbFields.gmb_data = body.gmb_data;
    gmbFields.gmb_fetched_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      wedding_id: wedding.id,
      name: body.name as string,
      category: body.category as string,
      ...allowed,
      ...gmbFields,
    })
    .select()
    .single();

  const err = supabaseError(error, "vendors");
  if (err) return err;

  notifyCollaborators({ weddingId: wedding.id, actorUserId: userId, action: "create", entityType: "vendors", entityName: (data as Record<string, unknown>).name as string });

  return NextResponse.json(data, { status: 201 });
}
