import { NextResponse } from "next/server";
import { getWeddingForUser } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  generateBudgetOptimization,
  shouldTriggerBudget,
  type ExpenseInput,
  type BudgetWeddingContext,
} from "@/lib/ai/budget-optimizer";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const status = await getSubscriptionStatus();

  const { data: optRow } = await supabase
    .from("budget_optimizations")
    .select("*")
    .eq("wedding_id", wedding.id)
    .is("dismissed_at", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("description, category, estimated, amount_paid, final_cost, paid")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null);

  const expenseInput = (expenses ?? []) as ExpenseInput[];
  const detection = shouldTriggerBudget(expenseInput);

  return NextResponse.json({
    optimization: optRow ?? null,
    detection,
    canGenerate: status.features.budgetOptimizer,
    tier: status.tier,
  });
}

export async function POST() {
  const status = await getSubscriptionStatus();
  if (!status.features.budgetOptimizer) {
    return NextResponse.json(
      { error: "AI budget optimizer is a Pro feature.", tier: status.tier, trialExpired: status.trialExpired },
      { status: 403 }
    );
  }

  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("description, category, estimated, amount_paid, final_cost, paid")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null);

  const expenseInput = (expenses ?? []) as ExpenseInput[];
  const detection = shouldTriggerBudget(expenseInput);
  if (!detection.triggered) {
    return NextResponse.json({ triggered: false }, { status: 200 });
  }

  const weddingCtx: BudgetWeddingContext = {
    partner1_name: wedding.partner1_name,
    partner2_name: wedding.partner2_name,
    wedding_date: wedding.date,
    budget: wedding.budget,
    guest_count_estimate: wedding.guest_count_estimate,
  };

  const gen = await generateBudgetOptimization(expenseInput, weddingCtx, detection);
  if (!gen.ok) {
    return NextResponse.json({ error: gen.error }, { status: 502 });
  }

  const { data: optRow, error } = await supabase
    .from("budget_optimizations")
    .insert({
      wedding_id: wedding.id,
      trigger_reason: gen.triggerReason,
      suggestion: gen.optimization,
      model: gen.model,
    })
    .select()
    .single();

  if (error) {
    console.error("[budget-optimize] insert failed:", error);
    return NextResponse.json({ error: "Couldn't save the suggestion." }, { status: 500 });
  }

  return NextResponse.json({ triggered: true, optimization: optRow }, { status: 201 });
}

export async function PATCH(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("budget_optimizations")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("wedding_id", wedding.id);

  if (error) {
    console.error("[budget-optimize] dismiss failed:", error);
    return NextResponse.json({ error: "Couldn't dismiss the suggestion." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
