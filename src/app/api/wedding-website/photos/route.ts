import { getWeddingForUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("wedding_photos")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: false });

  const err = supabaseError(error, "wedding-website/photos");
  if (err) return err;

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("wedding_photos")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "wedding-website/photos");
  if (err) return err;

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = await request.json();
  const { id, approved } = body;

  if (!id || typeof approved !== "boolean") {
    return NextResponse.json({ error: "id and approved required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("wedding_photos")
    .update({ approved })
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
