import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert array to object
  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[(row as { key: string; value: unknown }).key] = (row as { key: string; value: unknown }).value;
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const body = await request.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
