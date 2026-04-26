import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/vendor-import-rejections
 *
 * Returns the most recent import rejections for the admin review UI.
 * Optional query params:
 *   ?limit=N   default 100, max 500
 *   ?status=pending|overridden|all   default "pending" (overridden_at IS NULL)
 */
export async function GET(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100));
  const status = url.searchParams.get("status") || "pending";

  let query = supabase
    .from("vendor_import_rejections")
    .select("*")
    .order("rejected_at", { ascending: false })
    .limit(limit);

  if (status === "pending") query = query.is("overridden_at", null);
  else if (status === "overridden") query = query.not("overridden_at", "is", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rejections: data || [] });
}
