import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  const err = supabaseError(error, "admin/settings");
  if (err) return err;

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
  const value = body.value as Record<string, unknown> as import("@/lib/supabase/types").Json;

  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  const err = supabaseError(error, "admin/settings");
  if (err) return err;

  return NextResponse.json({ success: true });
}
