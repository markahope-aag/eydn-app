import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { requireAdmin } from "@/lib/admin";
import { untypedClient } from "@/lib/supabase/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

const BUCKET = "email-images";

/**
 * PATCH /api/admin/email/images/[id] — update editable metadata (alt text).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const db = untypedClient(result.supabase);
  const { id } = await ctx.params;

  const parsed = await safeParseJSON(req);
  if (isParseError(parsed)) return parsed;
  const body = parsed as Record<string, unknown>;

  if (typeof body.alt_text !== "string") {
    return NextResponse.json({ error: "alt_text is required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("email_images")
    .update({ alt_text: body.alt_text.slice(0, 300) })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return apiError(error.message, 500);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ image: data });
}

/**
 * DELETE /api/admin/email/images/[id] — remove the metadata row and the
 * underlying storage object.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const db = untypedClient(result.supabase);
  const { id } = await ctx.params;

  const { data: row, error: fetchError } = await db
    .from("email_images")
    .select("path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return apiError(fetchError.message, 500);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error: removeError } = await db.storage.from(BUCKET).remove([row.path]);
  if (removeError) {
    return apiError(removeError.message, 500);
  }

  const { error: deleteError } = await db.from("email_images").delete().eq("id", id);
  if (deleteError) {
    return apiError(deleteError.message, 500);
  }

  return NextResponse.json({ success: true });
}
