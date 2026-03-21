import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateTasks } from "@/lib/tasks/seed-tasks";
import { BUDGET_TEMPLATE } from "@/lib/budget/budget-template";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = body as any;

  // Upsert wedding with onboarding data
  const { data: existingWedding } = await supabase
    .from("weddings")
    .select("id")
    .eq("user_id", userId)
    .single();

  let weddingId: string;

  if (existingWedding) {
    weddingId = existingWedding.id;
    const { error } = await supabase
      .from("weddings")
      .update({
        partner1_name: b.partner1_name,
        partner2_name: b.partner2_name,
        date: b.date || null,
        venue: b.venue || null,
        budget: b.budget || null,
        guest_count_estimate: b.guest_count_estimate || null,
        style_description: b.style_description || null,
        has_wedding_party: b.has_wedding_party ?? null,
        wedding_party_count: b.wedding_party_count || null,
        has_pre_wedding_events: b.has_pre_wedding_events ?? null,
        has_honeymoon: b.has_honeymoon ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", weddingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { data: newWedding, error } = await supabase
      .from("weddings")
      .insert({
        user_id: userId,
        partner1_name: b.partner1_name,
        partner2_name: b.partner2_name,
        date: b.date || null,
        venue: b.venue || null,
        budget: b.budget || null,
        guest_count_estimate: b.guest_count_estimate || null,
        style_description: b.style_description || null,
        has_wedding_party: b.has_wedding_party ?? null,
        wedding_party_count: b.wedding_party_count || null,
        has_pre_wedding_events: b.has_pre_wedding_events ?? null,
        has_honeymoon: b.has_honeymoon ?? null,
      })
      .select("id")
      .single();

    if (error || !newWedding) {
      return NextResponse.json({ error: error?.message || "Failed to create wedding" }, { status: 500 });
    }
    weddingId = newWedding.id;
  }

  // Save questionnaire responses
  await supabase
    .from("questionnaire_responses")
    .upsert({
      wedding_id: weddingId,
      responses: b.responses || {},
      completed: true,
      updated_at: new Date().toISOString(),
    });

  // Generate tasks only if wedding date is set
  if (b.date) {
    // Delete any existing system-generated tasks
    await supabase
      .from("tasks")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("is_system_generated", true);

    const tasks = generateTasks({
      weddingId,
      weddingDate: b.date,
      hasWeddingParty: b.has_wedding_party ?? false,
      hasPreWeddingEvents: b.has_pre_wedding_events ?? false,
      hasHoneymoon: b.has_honeymoon ?? false,
      bookedVendors: b.booked_vendors || [],
    });

    // Insert tasks in batches (Supabase has limits)
    const batchSize = 50;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      await supabase.from("tasks").insert(batch);
    }
  }

  // Seed budget line items (skip if expenses already exist)
  const { count: existingExpenses } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("wedding_id", weddingId);

  if (!existingExpenses || existingExpenses === 0) {
    const budgetItems = BUDGET_TEMPLATE
      .filter((item) => {
        // Skip honeymoon items if no honeymoon planned
        if (item.category === "Honeymoon" && !b.has_honeymoon) return false;
        return true;
      })
      .map((item) => ({
        wedding_id: weddingId,
        description: item.description,
        estimated: 0,
        category: item.category,
        paid: false,
      }));

    await supabase.from("expenses").insert(budgetItems);
  }

  return NextResponse.json({ success: true, wedding_id: weddingId }, { status: 201 });
}
