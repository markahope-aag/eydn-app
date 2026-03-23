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

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Eydn Memory Plan",
            description:
              "Keep your wedding website live and your data accessible after the wedding. Renews annually.",
          },
          unit_amount: 2900,
          recurring: {
            interval: "year",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      wedding_id: w.id,
      type: "memory_plan",
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard/settings?memory=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app"}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
