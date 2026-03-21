import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("mood_board_items")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = await request.json();

  // Support both image upload URL and direct URL
  const { image_url, caption, category } = body;

  if (!image_url) {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mood_board_items")
    .insert({
      wedding_id: wedding.id,
      image_url,
      caption: caption || null,
      category: category || "General",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
