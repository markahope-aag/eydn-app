import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateTasks } from "@/lib/tasks/seed-tasks";
import { BUDGET_TEMPLATE } from "@/lib/budget/budget-template";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["partner1_name", "partner2_name"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date as string)) {
    return NextResponse.json({ error: "date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const partner1_name = body.partner1_name as string;
  const partner2_name = body.partner2_name as string;
  const date = (body.date as string) || null;
  const venue = (body.venue as string) || null;
  const venue_city = (body.venue_city as string) || null;
  const budget = (body.budget as number) || null;
  const guest_count_estimate = (body.guest_count_estimate as number) || null;
  const venue_status = (body.venue_status as string) || null;
  const prior_tools = (body.prior_tools as string[]) || [];
  const budget_allocations = (body.budget_allocations as Array<{ category: string; allocated: number }>) || null;
  const responses = ((body.responses as Record<string, unknown>) || {}) as import("@/lib/supabase/types").Json;

  // Support legacy fields from the old onboarding flow (Settings → Review Questionnaire)
  const style_description = (body.style_description as string) || null;
  const has_wedding_party = (body.has_wedding_party as boolean) ?? null;
  const wedding_party_count = (body.wedding_party_count as number) || null;
  const has_pre_wedding_events = (body.has_pre_wedding_events as boolean) ?? null;
  const has_honeymoon = (body.has_honeymoon as boolean) ?? null;
  const booked_vendors = (body.booked_vendors as string[]) || [];

  // Upsert wedding with onboarding data
  const { data: existingWedding } = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", userId)
    .single();

  let weddingId: string;

  const weddingFields = {
    partner1_name,
    partner2_name,
    date,
    venue,
    venue_city,
    budget,
    guest_count_estimate,
    style_description,
    has_wedding_party,
    wedding_party_count,
    has_pre_wedding_events,
    has_honeymoon,
    updated_at: new Date().toISOString(),
  };

  if (existingWedding) {
    weddingId = existingWedding.id;

    // Check if date is changing so we can cascade
    const { data: currentWedding } = await supabase
      .from("weddings")
      .select("date")
      .eq("id", weddingId)
      .single();

    const { error } = await supabase
      .from("weddings")
      .update(weddingFields)
      .eq("id", weddingId);

    const err = supabaseError(error, "onboarding");
    if (err) return err;

    // CASCADE: If wedding date changed, update rehearsal dinner date
    if (date && currentWedding?.date !== date) {
      const dayBefore = new Date(date + "T12:00:00");
      dayBefore.setDate(dayBefore.getDate() - 1);
      await supabase
        .from("rehearsal_dinner")
        .update({ date: dayBefore.toISOString().slice(0, 10) })
        .eq("wedding_id", weddingId);
    }
  } else {
    const { data: newWedding, error } = await supabase
      .from("weddings")
      .insert({
        user_id: userId,
        ...weddingFields,
      })
      .select("id")
      .single();

    if (error || !newWedding) {
      return NextResponse.json({ error: error?.message || "Couldn't create wedding" }, { status: 500 });
    }
    weddingId = newWedding.id;
  }

  // Save questionnaire responses
  await supabase
    .from("questionnaire_responses")
    .upsert({
      wedding_id: weddingId,
      responses,
      completed: true,
      updated_at: new Date().toISOString(),
    });

  // Save onboarding survey (prior tools for segmentation)
  if (prior_tools.length > 0) {
    // Table created via migration — not yet in generated types
    await (supabase as unknown as { from: (_t: string) => { upsert: (_d: Record<string, unknown>) => Promise<unknown> } })
      .from("onboarding_survey")
      .upsert({
        wedding_id: weddingId,
        prior_tools,
        venue_status,
      });
  }

  // Generate tasks if wedding date is set
  // New flow doesn't ask about wedding party/pre-wedding/honeymoon directly,
  // so default to true — tasks can be deleted from the dashboard if not needed.
  // Better to have extra tasks than to miss something.
  if (date) {
    await supabase
      .from("tasks")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("is_system_generated", true);

    const tasks = generateTasks({
      weddingId,
      weddingDate: date,
      hasWeddingParty: has_wedding_party ?? true,
      hasPreWeddingEvents: has_pre_wedding_events ?? true,
      hasHoneymoon: has_honeymoon ?? true,
      bookedVendors: booked_vendors,
    });

    const batchSize = 50;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      await supabase.from("tasks").insert(batch);
    }
  }

  // Seed budget line items
  const { count: existingExpenses } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("wedding_id", weddingId);

  if (!existingExpenses || existingExpenses === 0) {
    const budgetItems = BUDGET_TEMPLATE.map((item) => {
      // If budget allocations were provided, use them for estimated amounts
      const allocation = budget_allocations?.find((a) => a.category === item.category);
      return {
        wedding_id: weddingId,
        description: item.description,
        estimated: allocation?.allocated ?? 0,
        category: item.category,
        paid: false,
      };
    });

    await supabase.from("expenses").insert(budgetItems);
  }

  return NextResponse.json({ success: true, wedding_id: weddingId }, { status: 201 });
}
