import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import {
  normalizeCategory,
  normalizeState,
  normalizeCity,
  normalizePhone,
  normalizeWebsite,
  normalizeEmail,
  normalizePriceRange,
} from "@/lib/vendors/normalize";

/**
 * POST /api/admin/vendor-import-rejections/[id]/override
 *
 * Admin promotes a rejected vendor to suggested_vendors anyway. Sets
 * manually_approved=true so future re-runs don't re-reject the same
 * scraper row. Stamps the rejection with overridden_at + overridden_by.
 *
 * Idempotent: if the same scraper_id already exists in suggested_vendors,
 * we just stamp the override on the rejection row and return success.
 */
type RawScraperRow = {
  id: string;
  name?: string | null;
  category?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  description?: string | null;
  eydn_score?: number | null;
  price_level?: number | null;
};

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase, userId } = result;
  const { id } = await ctx.params;

  // Load the rejection row.
  const { data: rejection, error: rejErr } = await supabase
    .from("vendor_import_rejections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (rejErr) return NextResponse.json({ error: rejErr.message }, { status: 500 });
  if (!rejection) return NextResponse.json({ error: "Rejection not found" }, { status: 404 });

  if (rejection.overridden_at) {
    return NextResponse.json({ error: "Already overridden" }, { status: 409 });
  }

  // Check whether the scraper_id is already represented in suggested_vendors
  // (e.g. if an admin re-imported manually before clicking override).
  const { data: existing } = await supabase
    .from("suggested_vendors")
    .select("id")
    .eq("scraper_id", rejection.scraper_id)
    .maybeSingle();

  if (!existing) {
    // Re-normalize from the stored raw data and insert. We bypass the
    // quality check here — the admin's override is the authority.
    const raw = rejection.scraper_data as unknown as RawScraperRow;
    const rawCategory = raw.category || "";
    const rawState = raw.state || "";

    const insertRow = {
      scraper_id: rejection.scraper_id,
      name: raw.name?.trim() || "Unknown vendor",
      category: rawCategory ? (normalizeCategory(rawCategory) || rawCategory) : "Other",
      address: raw.street?.trim() || null,
      city: raw.city ? normalizeCity(raw.city) : "Unknown",
      state: rawState ? (normalizeState(rawState) || rawState.toUpperCase().slice(0, 2)) : "XX",
      zip: raw.zip?.trim() || null,
      country: raw.country?.trim() || "US",
      phone: raw.phone ? normalizePhone(raw.phone) : null,
      website: raw.website ? normalizeWebsite(raw.website) : null,
      email: raw.email ? normalizeEmail(raw.email) : null,
      description: raw.description?.trim() || null,
      price_range: raw.price_level !== null && raw.price_level !== undefined
        ? normalizePriceRange(String(raw.price_level))
        : null,
      quality_score: raw.eydn_score ?? null,
      featured: false,
      active: true,
      manually_approved: true,
      seed_source: "scraper_auto",
    };

    const { error: insertErr } = await supabase.from("suggested_vendors").insert(insertRow);
    if (insertErr) {
      return NextResponse.json({ error: `Insert failed: ${insertErr.message}` }, { status: 500 });
    }
  }

  // Stamp the rejection.
  const { error: stampErr } = await supabase
    .from("vendor_import_rejections")
    .update({ overridden_at: new Date().toISOString(), overridden_by: userId })
    .eq("id", id);
  if (stampErr) {
    return NextResponse.json({ error: `Override stamp failed: ${stampErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
