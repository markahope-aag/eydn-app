import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("weddings")
    .select("id")
    .eq("website_slug", slug)
    .neq("id", wedding.id)
    .maybeSingle();

  return NextResponse.json({ available: !existing });
}
