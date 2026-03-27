import { getWeddingForUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("registry_links")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  const err = supabaseError(error, "wedding-website/registry");
  if (err) return err;

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  // Get the next sort order
  const { count } = await supabase
    .from("registry_links")
    .select("*", { count: "exact", head: true })
    .eq("wedding_id", wedding.id);

  const { data, error } = await supabase
    .from("registry_links")
    .insert({
      wedding_id: wedding.id,
      name: body.name as string,
      url: body.url as string,
      sort_order: (count ?? 0) + 1,
    })
    .select()
    .single();

  const err = supabaseError(error, "wedding-website/registry");
  if (err) return err;

  return NextResponse.json(data, { status: 201 });
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
    .from("registry_links")
    .delete()
    .eq("id", id)
    .eq("wedding_id", wedding.id);

  const err = supabaseError(error, "wedding-website/registry");
  if (err) return err;

  return NextResponse.json({ success: true });
}
