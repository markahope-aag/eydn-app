import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding } = result;

  return NextResponse.json({
    slug: wedding.website_slug,
    headline: wedding.website_headline,
    story: wedding.website_story,
    schedule: wedding.website_schedule,
    travel: wedding.website_travel_info,
    accommodations: wedding.website_accommodations,
    faq: wedding.website_faq,
    cover_url: wedding.website_cover_url,
    couple_photo_url: wedding.website_couple_photo_url,
    enabled: wedding.website_enabled,
  });
}

export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  // Validate slug format
  if (body.slug !== undefined && body.slug !== null) {
    const slug = body.slug as string;
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
      return NextResponse.json(
        { error: "URL must be 3-50 characters, lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }
  }

  // If slug is being set/changed, check uniqueness
  if (body.slug && body.slug !== wedding.website_slug) {
    const { data: existing } = await supabase
      .from("weddings")
      .select("id")
      .eq("website_slug", body.slug as string)
      .neq("id", wedding.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This URL is already taken" },
        { status: 409 }
      );
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.slug !== undefined) updates.website_slug = body.slug;
  if (body.headline !== undefined) updates.website_headline = body.headline;
  if (body.story !== undefined) updates.website_story = body.story;
  if (body.schedule !== undefined) updates.website_schedule = body.schedule;
  if (body.travel !== undefined) updates.website_travel_info = body.travel;
  if (body.accommodations !== undefined) updates.website_accommodations = body.accommodations;
  if (body.faq !== undefined) updates.website_faq = body.faq;
  if (body.cover_url !== undefined) updates.website_cover_url = body.cover_url;
  if (body.couple_photo_url !== undefined) updates.website_couple_photo_url = body.couple_photo_url;
  if (body.enabled !== undefined) updates.website_enabled = body.enabled;

  const { error } = await supabase
    .from("weddings")
    .update(updates)
    .eq("id", wedding.id);

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
