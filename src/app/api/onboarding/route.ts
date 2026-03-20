import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateTasks } from "@/lib/tasks/seed-tasks";
import { BUDGET_TEMPLATE } from "@/lib/budget/budget-template";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const body = await request.json();

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
        partner1_name: body.partner1_name,
        partner2_name: body.partner2_name,
        date: body.date || null,
        venue: body.venue || null,
        budget: body.budget || null,
        guest_count_estimate: body.guest_count_estimate || null,
        style_description: body.style_description || null,
        has_wedding_party: body.has_wedding_party ?? null,
        wedding_party_count: body.wedding_party_count || null,
        has_pre_wedding_events: body.has_pre_wedding_events ?? null,
        has_honeymoon: body.has_honeymoon ?? null,
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
        partner1_name: body.partner1_name,
        partner2_name: body.partner2_name,
        date: body.date || null,
        venue: body.venue || null,
        budget: body.budget || null,
        guest_count_estimate: body.guest_count_estimate || null,
        style_description: body.style_description || null,
        has_wedding_party: body.has_wedding_party ?? null,
        wedding_party_count: body.wedding_party_count || null,
        has_pre_wedding_events: body.has_pre_wedding_events ?? null,
        has_honeymoon: body.has_honeymoon ?? null,
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
      responses: body.responses || {},
      completed: true,
      updated_at: new Date().toISOString(),
    });

  // Generate tasks only if wedding date is set
  if (body.date) {
    // Delete any existing system-generated tasks
    await supabase
      .from("tasks")
      .delete()
      .eq("wedding_id", weddingId)
      .eq("is_system_generated", true);

    const tasks = generateTasks({
      weddingId,
      weddingDate: body.date,
      hasWeddingParty: body.has_wedding_party ?? false,
      hasPreWeddingEvents: body.has_pre_wedding_events ?? false,
      hasHoneymoon: body.has_honeymoon ?? false,
      bookedVendors: body.booked_vendors || [],
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
        if (item.category === "Honeymoon" && !body.has_honeymoon) return false;
        return true;
      })
      .map((item) => ({
        wedding_id: weddingId,
        description: item.description,
        amount: 0,
        category: item.category,
        paid: false,
      }));

    await supabase.from("expenses").insert(budgetItems);
  }

  return NextResponse.json({ success: true, wedding_id: weddingId }, { status: 201 });
}
