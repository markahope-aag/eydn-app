import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";

const ALLOWED_FIELDS = [
  "name", "role", "email", "phone", "job_assignment", "photo_url", "attire", "sort_order",
  "address_line1", "address_line2", "city", "state", "zip",
];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/wedding-party/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
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
    .from("wedding_party")
    .update(updates)
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "wedding-party");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "wedding_party", entityId: id, entityName: (data as Record<string, unknown>).name as string });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/wedding-party/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "wedding_party", id, wedding.id);

  const err = supabaseError(error, "wedding-party");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "wedding_party", entityId: id });

  return NextResponse.json({ success: true });
}
