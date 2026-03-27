import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields, isOneOf, isValidNumber, MAX_MONETARY_AMOUNT } from "@/lib/validation";
import { notifyCollaborators } from "@/lib/audit";

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

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
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
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      wedding_id: wedding.id,
      name: body.name as string,
      category: body.category as string,
      ...allowed,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  notifyCollaborators({ weddingId: wedding.id, actorUserId: userId, action: "create", entityType: "vendors", entityName: (data as Record<string, unknown>).name as string });

  return NextResponse.json(data, { status: 201 });
}
