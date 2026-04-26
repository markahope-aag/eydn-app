import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

/** GET /api/admin/places-seed-configs — list all configs with run metadata. */
export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("places_seed_configs")
    .select("*")
    .order("category", { ascending: true })
    .order("city", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: data || [] });
}

/**
 * POST /api/admin/places-seed-configs
 * Body: { category, city, state, country?, max_results?, enabled? }
 * Or:   { configs: [...] }  // bulk add
 */
export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as Record<string, unknown>;

  type SeedConfigInsert = {
    category: string;
    city: string;
    state: string;
    country: string;
    max_results: number;
    enabled: boolean;
  };

  // Bulk path: { configs: [{category, city, state, ...}, ...] }
  const rows = Array.isArray(body.configs) ? body.configs : [body];
  const insertRows: SeedConfigInsert[] = [];

  for (const r of rows as Record<string, unknown>[]) {
    if (typeof r.category !== "string" || typeof r.city !== "string" || typeof r.state !== "string") {
      return NextResponse.json(
        { error: "Each config requires category, city, state (strings)." },
        { status: 400 }
      );
    }
    insertRows.push({
      category: r.category,
      city: r.city,
      state: r.state,
      country: typeof r.country === "string" ? r.country : "US",
      max_results: typeof r.max_results === "number" ? Math.max(1, Math.min(60, r.max_results)) : 20,
      enabled: typeof r.enabled === "boolean" ? r.enabled : true,
    });
  }

  // Upsert on the (category, city, state) unique constraint so re-adding
  // an existing combo just toggles it back on instead of erroring.
  const { data, error } = await supabase
    .from("places_seed_configs")
    .upsert(insertRows, { onConflict: "category,city,state" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: data || [] }, { status: 201 });
}
