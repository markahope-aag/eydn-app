import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

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
    rsvp_deadline: (wedding as Record<string, unknown>).rsvp_deadline ?? null,
    meal_options: (wedding as Record<string, unknown>).meal_options ?? [],
    photo_approval_required: (wedding as Record<string, unknown>).photo_approval_required ?? false,
    website_theme: (wedding as Record<string, unknown>).website_theme ?? {},
    hotels: (wedding as Record<string, unknown>).website_hotels ?? [],
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
  if (body.rsvp_deadline !== undefined) updates.rsvp_deadline = body.rsvp_deadline;
  if (body.meal_options !== undefined) updates.meal_options = body.meal_options;
  if (body.photo_approval_required !== undefined) updates.photo_approval_required = body.photo_approval_required;
  if (body.website_theme !== undefined) updates.website_theme = body.website_theme;
  if (body.hotels !== undefined) updates.website_hotels = body.hotels;

  const { error } = await supabase
    .from("weddings")
    .update(updates)
    .eq("id", wedding.id);

  const err = supabaseError(error, "wedding-website");
  if (err) return err;

  return NextResponse.json({ success: true });
}
