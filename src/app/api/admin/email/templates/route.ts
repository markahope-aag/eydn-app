import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/email/templates — list all email templates with summary fields.
 * Used by the admin email-sequences page to render the template list.
 */
export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("email_templates")
    .select("slug, category, description, subject, variables, enabled, updated_at")
    .order("category", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data || [] });
}
