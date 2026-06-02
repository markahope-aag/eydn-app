import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseError } from "@/lib/api-error";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding } = result;

  return NextResponse.json({
    quickstart_dismissed:
      (wedding as { quickstart_dismissed?: boolean }).quickstart_dismissed ?? false,
  });
}

/**
 * PUT — toggle the Quick Start walk-through. Body `{ dismissed: false }`
 * re-launches it (e.g. from Help); anything else opts out into the full
 * dashboard. The dashboard also auto-graduates once setup is complete.
 */
export async function PUT(req: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = (await req.json().catch(() => ({}))) as { dismissed?: boolean };
  const dismissed = body.dismissed !== false;

  // quickstart_dismissed isn't in the generated types yet — write via an
  // untyped view of the client (same escape hatch used elsewhere).
  const db = supabase as unknown as SupabaseClient;
  const { error } = await db
    .from("weddings")
    .update({ quickstart_dismissed: dismissed })
    .eq("id", wedding.id);

  const err = supabaseError(error, "quickstart-status");
  if (err) return err;

  return NextResponse.json({ success: true });
}
