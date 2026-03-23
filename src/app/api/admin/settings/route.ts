import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const key = body.key as string | undefined;
  const value = body.value as Record<string, unknown>;

  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
