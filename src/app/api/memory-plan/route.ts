import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export type MemoryPlanStatus = {
  active: boolean;
  expiresAt: string | null;
  phase: "active" | "post_wedding" | "archived" | "sunset";
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: wedding } = await supabase
    .from("weddings")
    .select("phase, memory_plan_active, memory_plan_expires_at")
    .eq("user_id", userId)
    .single();

  if (!wedding) {
    return NextResponse.json({ error: "No wedding found" }, { status: 404 });
  }

  const w = wedding as {
    phase: string;
    memory_plan_active: boolean;
    memory_plan_expires_at: string | null;
  };

  return NextResponse.json({
    active: w.memory_plan_active ?? false,
    expiresAt: w.memory_plan_expires_at,
    phase: (w.phase ?? "active") as MemoryPlanStatus["phase"],
  } satisfies MemoryPlanStatus);
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: wedding } = await supabase
    .from("weddings")
    .select("id, memory_plan_active")
    .eq("user_id", userId)
    .single();

  if (!wedding) {
    return NextResponse.json({ error: "No wedding found" }, { status: 404 });
  }

  const w = wedding as { id: string; memory_plan_active: boolean };

  if (w.memory_plan_active) {
    return NextResponse.json({ error: "Memory Plan already active" }, { status: 400 });
  }

  const memoryPlanPriceId = process.env.STRIPE_MEMORY_PLAN_PRICE_ID;
  if (!memoryPlanPriceId) {
    return NextResponse.json(
      { error: "Memory Plan is not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: memoryPlanPriceId, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        user_id: userId,
        wedding_id: w.id,
        type: "memory_plan",
      },
    },
    metadata: {
      user_id: userId,
      wedding_id: w.id,
      type: "memory_plan",
    },
    success_url: `${appUrl}/dashboard/settings?memory=success`,
    cancel_url: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
