import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const state = url.searchParams.get("state");

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("suggested_vendors")
    .select()
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);
  if (city) query = query.ilike("city", `%${city}%`);
  if (state) query = query.eq("state", state);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
