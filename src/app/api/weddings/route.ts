import { auth } from "@clerk/nextjs/server";
import { getWeddingForUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields, pickFields } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";
import { captureServer } from "@/lib/analytics-server";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  return NextResponse.json(result.wedding);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["partner1_name", "partner2_name"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const allowed = pickFields(body, ["date", "venue", "budget"]);
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("weddings")
    .insert({
      user_id: userId,
      partner1_name: body.partner1_name as string,
      partner2_name: body.partner2_name as string,
      ...allowed,
    })
    .select()
    .single();

  const err = supabaseError(error, "weddings");
  if (err) return err;

  if (data) {
    const referer = request.headers.get("referer") || "";
    const utm = extractUtm(referer);
    await captureServer(userId, "trial_signup", {
      wedding_id: (data as { id: string }).id,
      source: "weddings_post",
      ...utm,
    });
  }

  return NextResponse.json(data, { status: 201 });
}

function extractUtm(url: string): Record<string, string> {
  try {
    const u = new URL(url);
    const out: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const v = u.searchParams.get(key);
      if (v) out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}
