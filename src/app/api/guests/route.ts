import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields, isValidEmail } from "@/lib/validation";
import { logActivity, notifyCollaborators } from "@/lib/audit";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("guests")
    .select("*")
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

  const missing = requireFields(body, ["name"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (body.email && !isValidEmail(body.email)) {
    return NextResponse.json({ error: "email is not a valid email address" }, { status: 400 });
  }

  const allowed = pickFields(body, ["email", "rsvp_status", "meal_preference", "plus_one", "role", "phone", "group_name", "address_line1", "address_line2", "city", "state", "zip", "plus_one_name"]);
  const { data, error } = await supabase
    .from("guests")
    .insert({
      wedding_id: wedding.id,
      name: body.name as string,
      ...allowed,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  logActivity(supabase, { weddingId: wedding.id, userId, action: "create", entityType: "guests", entityId: (data as Record<string, unknown>).id as string, entityName: (data as Record<string, unknown>).name as string });
  notifyCollaborators({ weddingId: wedding.id, actorUserId: userId, action: "create", entityType: "guests", entityName: (data as Record<string, unknown>).name as string });

  // Auto-add to wedding party if role is "wedding_party" (skip if flagged to prevent loops)
  if (body.role === "wedding_party" && !body._skip_sync) {
    const name = body.name as string;
    const { data: existingMember } = await supabase
      .from("wedding_party")
      .select("id")
      .eq("wedding_id", wedding.id)
      .eq("name", name)
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (!existingMember) {
      await supabase.from("wedding_party").insert({
        wedding_id: wedding.id,
        name,
        role: "Wedding Party",
        email: (body.email as string) || null,
        phone: (body.phone as string) || null,
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
