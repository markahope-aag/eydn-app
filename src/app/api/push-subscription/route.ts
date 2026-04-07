import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const subscription = body.subscription as Record<string, unknown> | undefined;
  if (!subscription || !subscription.endpoint) {
    return NextResponse.json({ error: "Valid push subscription required" }, { status: 400 });
  }

  // Upsert subscription (one per user per wedding)
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        wedding_id: wedding.id,
        user_id: userId,
        subscription: subscription as import("@/lib/supabase/types").Json,
      },
      { onConflict: "wedding_id,user_id" }
    );

  const err = supabaseError(error, "push-subscription");
  if (err) return err;

  return NextResponse.json({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("wedding_id", wedding.id)
    .eq("user_id", userId);

  return NextResponse.json({ success: true });
}
