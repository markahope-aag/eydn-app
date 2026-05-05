import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { generateVendorBrief } from "@/lib/guides/vendor-brief";

/** Generate a vendor brief from completed guide responses. */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;
  const { slug } = await ctx.params;

  // Fetch the guide responses
  const { data: guide } = await supabase
    .from("guide_responses")
    .select("*")
    .eq("wedding_id", wedding.id)
    .eq("guide_slug", slug)
    .single();

  if (!guide) {
    return NextResponse.json({ error: "Guide not found or not started" }, { status: 404 });
  }

  const responses = (guide as { responses: Record<string, unknown> }).responses;

  // Also fetch cross-referenced data (colors, guest count, etc.)
  const { data: allGuides } = await supabase
    .from("guide_responses")
    .select("guide_slug, responses")
    .eq("wedding_id", wedding.id)
    .eq("completed", true);

  const crossData: Record<string, Record<string, unknown>> = {};
  for (const g of allGuides || []) {
    const row = g as { guide_slug: string; responses: Record<string, unknown> };
    crossData[row.guide_slug] = row.responses;
  }

  // Pull saved mood board images so visual-style briefs (florist, decor,
  // hair-makeup) include direct links to the imagery the couple has pinned.
  // Capped at 10 to keep the brief copy-paste friendly.
  const { data: pins } = await supabase
    .from("mood_board_items")
    .select("image_url, caption")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const moodBoardImages = (pins || []).map((p) => ({
    url: (p as { image_url: string }).image_url,
    caption: (p as { caption: string | null }).caption ?? null,
  }));

  const brief = generateVendorBrief(slug, responses, crossData, {
    partner1: wedding.partner1_name,
    partner2: wedding.partner2_name,
    date: wedding.date,
    venue: wedding.venue,
  }, moodBoardImages);

  if (!brief) {
    return NextResponse.json({ error: "This guide does not generate a vendor brief" }, { status: 400 });
  }

  // Save the brief
  await supabase
    .from("guide_responses")
    .update({ vendor_brief: brief as import("@/lib/supabase/types").Json, updated_at: new Date().toISOString() })
    .eq("wedding_id", wedding.id)
    .eq("guide_slug", slug);

  return NextResponse.json(brief);
}
