import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const BETA_SLOTS = 50;

/** POST: Claim a beta slot (assigns beta role to authenticated user) */
export async function POST(_request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const rl = await checkRateLimit(`beta-claim:${userId}`, RATE_LIMITS.auth);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  // Check if user already has a privileged role
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "beta"])
    .limit(1)
    .single();

  if (existingRole) {
    return NextResponse.json({ success: true, already: true });
  }

  // Check if user already has a paid purchase
  const { data: purchase } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (purchase) {
    return NextResponse.json({ success: true, already: true });
  }

  // Count current beta users
  const { count } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "beta");

  if ((count ?? 0) >= BETA_SLOTS) {
    return NextResponse.json({ error: "Beta is full", beta_full: true }, { status: 409 });
  }

  // Assign beta role
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "beta" });

  if (error) {
    console.error("[BETA] Failed to assign role:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
