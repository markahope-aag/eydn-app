import { getWeddingForUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("wedding_photos")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

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

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
