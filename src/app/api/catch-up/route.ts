import { NextResponse } from "next/server";
import { getWeddingForUser } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  generateCatchUpPlan,
  shouldTriggerCatchUp,
  type CatchUpTaskInput,
  type CatchUpWeddingContext,
} from "@/lib/ai/catch-up-generator";

/**
 * GET /api/catch-up
 * Returns the latest active (non-dismissed) catch-up plan for this
 * wedding, plus a detection signal so the UI can decide whether to
 * show a "request a plan" CTA for Pro users or a paywall for free.
 *
 * Shape: { plan, detection, canGenerate }
 */
export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const status = await getSubscriptionStatus();

  const { data: planRow } = await supabase
    .from("catch_up_plans")
    .select("*")
    .eq("wedding_id", wedding.id)
    .is("dismissed_at", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, category, due_date, completed, notes")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null);

  const taskInput = (tasks ?? []) as CatchUpTaskInput[];
  const detection = shouldTriggerCatchUp(taskInput);

  return NextResponse.json({
    plan: planRow ?? null,
    detection,
    canGenerate: status.features.catchUpPlans,
    tier: status.tier,
  });
}

/**
 * POST /api/catch-up
 * Generate a new catch-up plan. Pro-gated via features.catchUpPlans.
 * Detects whether the wedding actually needs one; if not, returns
 * { triggered: false } without touching Claude.
 */
export async function POST() {
  const status = await getSubscriptionStatus();
  if (!status.features.catchUpPlans) {
    return NextResponse.json(
      { error: "AI catch-up plans are a Pro feature.", tier: status.tier, trialExpired: status.trialExpired },
      { status: 403 }
    );
  }

  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, category, due_date, completed, notes")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null);

  const taskInput = (tasks ?? []) as CatchUpTaskInput[];
  const detection = shouldTriggerCatchUp(taskInput);
  if (!detection.triggered) {
    return NextResponse.json({ triggered: false }, { status: 200 });
  }

  const weddingCtx: CatchUpWeddingContext = {
    partner1_name: wedding.partner1_name,
    partner2_name: wedding.partner2_name,
    wedding_date: wedding.date,
    venue: wedding.venue,
    venue_city: wedding.venue_city,
    budget: wedding.budget,
    guest_count_estimate: wedding.guest_count_estimate,
    style_description: wedding.style_description,
  };

  const gen = await generateCatchUpPlan(taskInput, weddingCtx, detection);
  if (!gen.ok) {
    return NextResponse.json({ error: gen.error }, { status: 502 });
  }

  const { data: planRow, error } = await supabase
    .from("catch_up_plans")
    .insert({
      wedding_id: wedding.id,
      trigger_reason: gen.triggerReason,
      plan: gen.plan,
      model: gen.model,
    })
    .select()
    .single();

  if (error) {
    console.error("[catch-up] insert failed:", error);
    return NextResponse.json({ error: "Couldn't save the plan." }, { status: 500 });
  }

  return NextResponse.json({ triggered: true, plan: planRow }, { status: 201 });
}

/**
 * PATCH /api/catch-up
 * Dismiss the current active plan. Body: { id: string }.
 */
export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("catch_up_plans")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("wedding_id", wedding.id);

  if (error) {
    console.error("[catch-up] dismiss failed:", error);
    return NextResponse.json({ error: "Couldn't dismiss the plan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
