import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError } from "@/lib/validation";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("push_subscriptions")
    .upsert(
      {
        wedding_id: wedding.id,
        user_id: userId,
        subscription: subscription as Record<string, unknown>,
      },
      { onConflict: "wedding_id,user_id" }
    );

  if (error) {
    console.error("[API]", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("push_subscriptions")
    .delete()
    .eq("wedding_id", wedding.id)
    .eq("user_id", userId);

  return NextResponse.json({ success: true });
}
