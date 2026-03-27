import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

/** Get guide responses for a specific guide. */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;
  const { slug } = await ctx.params;

  const { data } = await supabase
    .from("guide_responses")
    .select("*")
    .eq("wedding_id", wedding.id)
    .eq("guide_slug", slug)
    .single();

  return NextResponse.json(data || null);
}

/** Save/update guide responses (auto-save on each section). */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;
  const { slug } = await ctx.params;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const { data, error } = await supabase
    .from("guide_responses")
    .upsert(
      {
        wedding_id: wedding.id,
        guide_slug: slug,
        responses: ((body.responses as Record<string, unknown>) || {}) as import("@/lib/supabase/types").Json,
        section_index: (body.section_index as number) ?? 0,
        completed: (body.completed as boolean) ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wedding_id,guide_slug" }
    )
    .select()
    .single();

  const err = supabaseError(error, "guides");
  if (err) return err;

  return NextResponse.json(data);
}
