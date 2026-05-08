import { getWeddingForUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";
import {
  normalizeCity,
  normalizeState,
  normalizePhone,
  normalizeWebsite,
} from "@/lib/vendors/normalize";
import { checkQuality } from "@/lib/vendors/quality";
import { applyFeaturedRule } from "@/lib/vendors/featured";
import { sendSeedToScraper } from "@/lib/scraper-seed";
import type { PlaceData } from "@/lib/google-places";
import type { Database, Json } from "@/lib/supabase/types";

/**
 * POST /api/vendors/from-place
 *
 * Used by the couple's "Add Vendor" form when they pick a Google Places
 * lookup result. Two writes happen:
 *
 *   1. Always: insert into the couple's private `vendors` with the
 *      enriched data (gmb_data, gmb_place_id, contact info).
 *
 *   2. Sometimes: contribute back to the public directory.
 *      - If a `suggested_vendors` row already exists with this gmb_place_id,
 *        no directory write needed (link the couple's row by place_id).
 *      - Else run quality gates on the candidate. If it passes, insert
 *        into `suggested_vendors` directly with seed_source='couple_added'
 *        and recompute the auto-featured rule.
 *      - If quality fails, insert into `vendor_submissions` for admin
 *        review (preserves the existing two-step behavior for low-quality
 *        manual entries).
 *
 * Returns: { vendorId, directoryAction: 'already_exists' | 'added' |
 *           'submitted_for_review', suggestedVendorId?, submissionId? }
 */
export async function POST(request: Request) {
  const ctx = await getWeddingForUser();
  if ("error" in ctx) return ctx.error;
  const { wedding, supabase, userId } = ctx;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as {
    place?: unknown;
    category?: unknown;
    nameOverride?: unknown;
    cityHint?: unknown;
    stateHint?: unknown;
  };

  if (!body.place || typeof body.place !== "object") {
    return NextResponse.json({ error: "place data is required" }, { status: 400 });
  }
  const place = body.place as Partial<PlaceData> & { placeId?: string; name?: string };
  if (!place.placeId || !place.name) {
    return NextResponse.json({ error: "place must include placeId and name" }, { status: 400 });
  }

  const category = typeof body.category === "string" && body.category ? body.category : null;
  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const vendorName = (typeof body.nameOverride === "string" && body.nameOverride.trim()) || place.name;

  // ── 1. Create the couple's private vendor row ────────────────────────────
  const { data: privateVendor, error: privateErr } = await supabase
    .from("vendors")
    .insert({
      wedding_id: wedding.id,
      name: vendorName,
      category,
      poc_phone: place.nationalPhoneNumber || null,
      gmb_place_id: place.placeId,
      gmb_data: place as unknown as Json,
      gmb_fetched_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const privateErrResp = supabaseError(privateErr, "vendors/from-place");
  if (privateErrResp) return privateErrResp;

  // Parse city/state up front so both directory paths and the scraper
  // write-back can use them. couple's hints win; falls back to address parse.
  const cityHint = typeof body.cityHint === "string" ? body.cityHint.trim() : "";
  const stateHint = typeof body.stateHint === "string" ? body.stateHint.trim() : "";
  const parsed_city = cityHint ? normalizeCity(cityHint) : extractCityFromAddress(place.formattedAddress);
  const parsed_state = stateHint
    ? (normalizeState(stateHint) || stateHint.toUpperCase().slice(0, 2))
    : extractStateFromAddress(place.formattedAddress);

  // Helper: fire the scraper write-back when we have a clean city/state pair.
  // Idempotent server-side, so it's safe to call from both directory paths.
  // Errors are swallowed — the couple's row is already saved.
  async function maybeSeedScraper() {
    if (!parsed_city || !parsed_state || parsed_state.length !== 2) return;
    await sendSeedToScraper({
      place: place as PlaceData,
      category: category!,
      city: parsed_city,
      state: parsed_state,
    });
  }

  // ── 2. Directory contribution: dedup by gmb_place_id ─────────────────────
  // Use the admin client so RLS doesn't block lookups/writes against the
  // public directory tables. The couple is allowed to see and contribute.
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from("suggested_vendors")
    .select("id")
    .eq("gmb_place_id", place.placeId)
    .maybeSingle();

  if (existing) {
    await maybeSeedScraper();
    return NextResponse.json({
      vendorId: privateVendor!.id,
      directoryAction: "already_exists",
      suggestedVendorId: existing.id,
    });
  }

  const phone = place.nationalPhoneNumber ? normalizePhone(place.nationalPhoneNumber) : null;
  const website = place.websiteUri ? normalizeWebsite(place.websiteUri) : null;

  const candidate = {
    name: vendorName,
    category,
    address: place.formattedAddress || null,
    city: parsed_city,
    state: parsed_state,
    phone,
    website,
    quality_score: place.rating !== null && place.rating !== undefined ? Math.round(place.rating * 20) : null,
    description_status: null,
  };

  // Hard structural check: city/state are required for directory inclusion.
  // If we couldn't parse them from the formatted address and the couple
  // didn't hint them, fall through to vendor_submissions for admin to fix.
  const structurallyComplete = !!(candidate.city && candidate.state && candidate.state.length === 2);
  const quality = structurallyComplete ? checkQuality(candidate) : { passed: false, failedRules: ["missing city or state"] };

  if (quality.passed) {
    const { data: directoryVendor, error: dirErr } = await admin
      .from("suggested_vendors")
      .insert({
        name: candidate.name,
        category: candidate.category,
        address: candidate.address,
        city: candidate.city as string,
        state: candidate.state as string,
        phone: candidate.phone,
        website: candidate.website,
        quality_score: candidate.quality_score,
        gmb_place_id: place.placeId,
        gmb_data: place as unknown as Json,
        gmb_last_refreshed_at: new Date().toISOString(),
        seed_source: "couple_added",
        import_source: "couple_added",
        active: true,
        featured: false,
      } satisfies Database["public"]["Tables"]["suggested_vendors"]["Insert"])
      .select("id")
      .single();

    const dirErrResp = supabaseError(dirErr, "suggested_vendors/from-place");
    if (dirErrResp) {
      // Couple's row is already saved; surface the partial success.
      return NextResponse.json({
        vendorId: privateVendor!.id,
        directoryAction: "submitted_for_review",
        directoryError: dirErr?.message,
      });
    }

    // Recompute featured for this category — a high-quality couple-added
    // row could displace someone in the top 10%.
    try {
      await applyFeaturedRule(admin, { categories: [candidate.category] });
    } catch {
      // Non-fatal — nightly safety-net cron will reconcile.
    }

    await maybeSeedScraper();

    return NextResponse.json({
      vendorId: privateVendor!.id,
      directoryAction: "added",
      suggestedVendorId: directoryVendor!.id,
    });
  }

  // Quality gate failed — fall back to admin review queue with the rich data.
  const { data: submission } = await admin
    .from("vendor_submissions")
    .insert({
      submitted_by: userId,
      name: candidate.name,
      category: candidate.category,
      website: candidate.website,
      phone: candidate.phone,
      city: candidate.city,
      state: candidate.state,
      notes: `Auto-failed quality (${quality.failedRules.join("; ")}). Google place_id=${place.placeId}`,
    })
    .select("id")
    .single();

  return NextResponse.json({
    vendorId: privateVendor!.id,
    directoryAction: "submitted_for_review",
    submissionId: submission?.id,
    failedRules: quality.failedRules,
  });
}

/** Pull the city out of "123 Main St, Austin, TX 78701, USA" — best-effort. */
function extractCityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  // Typical US shape: ["123 Main St", "Austin", "TX 78701", "USA"]
  if (parts.length >= 3) return normalizeCity(parts[parts.length - 3]);
  return null;
}

/** Pull the state abbreviation out of "..., TX 78701, USA" — best-effort. */
function extractStateFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    // Second-to-last looks like "TX 78701"
    const stateZip = parts[parts.length - 2];
    const match = stateZip.match(/\b([A-Z]{2})\b/);
    if (match) return normalizeState(match[1]);
  }
  return null;
}
