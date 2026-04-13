import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

/** GET — current user's pending scheduled subscription (if any) */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("scheduled_subscriptions")
    .select("id, plan, scheduled_for, status, stripe_customer_id, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  return NextResponse.json(data || null);
}

/** PATCH — cancel or switch plan on the pending row */
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed as { action?: "cancel" | "switch_plan"; plan?: "pro_monthly" | "lifetime" };

  const supabase = createSupabaseAdmin();

  if (body.action === "cancel") {
    const { error } = await supabase
      .from("scheduled_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "switch_plan" && (body.plan === "pro_monthly" || body.plan === "lifetime")) {
    const { error } = await supabase
      .from("scheduled_subscriptions")
      .update({ plan: body.plan, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
