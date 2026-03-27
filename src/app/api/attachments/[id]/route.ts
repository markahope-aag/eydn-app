import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { id } = await ctx.params;

  // Verify the attachment belongs to this wedding
  const { data: attachment } = await supabase
    .from("attachments")
    .select("id, file_name")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "attachments");
  if (err) return err;

  return NextResponse.json({ success: true });
}
