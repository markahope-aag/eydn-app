import { getWeddingForUser, readOnlyError } from "@/lib/auth";
import { untypedClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";

const ALLOWED_FIELDS = [
  "name", "email", "rsvp_status", "meal_preference", "role",
  "plus_one", "plus_one_name", "phone", "group_name",
  "address_line1", "address_line2", "city", "state", "zip",
  "table_number", "party_head_id",
];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/guests/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  if (result.role === "parent") return readOnlyError();
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const updates = pickFields(body, ALLOWED_FIELDS);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("guests")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "guests");
  if (err) return err;

  // Carry the guest over to the Wedding Party tab when their role is set
  // to "wedding_party" (mirrors the create path). Deduped by name so a
  // repeated update won't create duplicates.
  const updatedGuest = data as {
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
  };
  if (updatedGuest.role === "wedding_party") {
    const { data: existingMember } = await supabase
      .from("wedding_party")
      .select("id")
      .eq("wedding_id", wedding.id)
      .eq("name", updatedGuest.name)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!existingMember) {
      await supabase.from("wedding_party").insert({
        wedding_id: wedding.id,
        name: updatedGuest.name,
        role: "Attendant",
        email: updatedGuest.email,
        phone: updatedGuest.phone,
      });
    }
  }

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "guests", entityId: id, entityName: (data as Record<string, unknown>).name as string });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/guests/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  if (result.role === "parent") return readOnlyError();
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "guests", id, wedding.id);

  const err = supabaseError(error, "guests");
  if (err) return err;

  // Cascade: removing a head guest also removes their party members
  // (children / plus-ones attending with them).
  await untypedClient(supabase)
    .from("guests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("party_head_id", id)
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null);

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "guests", entityId: id });

  return NextResponse.json({ success: true });
}
