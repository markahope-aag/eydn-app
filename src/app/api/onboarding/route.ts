import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateTasks } from "@/lib/tasks/seed-tasks";
import { personalizeTaskMessages, applyDeterministicMessages } from "@/lib/ai/task-personalizer";
import { BUDGET_TEMPLATE } from "@/lib/budget/budget-template";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";
import { captureServer } from "@/lib/analytics-server";
import { geocodeAddress } from "@/lib/geocoding";

// Onboarding seeds tasks + budget and runs the (blocking) AI personalization
// pass. The default ~15s function budget left no room for the Claude call, so
// give it headroom. The deterministic baseline still applies even if the AI
// pass times out within this window.
export const maxDuration = 60;

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

  // Onboarding creates/updates the user's OWN wedding (by user_id). A
  // collaborator invited to someone else's wedding must not use the Review
  // Questionnaire flow to edit the couple's core details (date, venue, budget,
  // etc.) — the role-gated /api/weddings/[id] route is the sanctioned editor and
  // it blocks coordinators/parents. Without this guard a coordinator could
  // change the wedding date here, bypassing that block (and spin up a phantom
  // wedding owned by them). A brand-new user with no association falls through
  // to the normal create path below.
  if (!existingWedding) {
    const { data: collab } = await supabase
      .from("wedding_collaborators")
      .select("role")
      .eq("user_id", userId)
      .eq("invite_status", "accepted")
      .limit(1)
      .maybeSingle();
    if (collab) {
      return NextResponse.json(
        { error: "Only the couple can edit the wedding details — ask them to update this." },
        { status: 403 }
      );
    }
  }

  let weddingId: string;

  // Geocode the venue city up front so the vendor directory's distance filter
  // works immediately — otherwise venue_city is saved without coordinates and
  // the radius control never appears. Failure is non-fatal (we just skip it).
  let geoFields: Record<string, unknown> = {};
  if (venue_city) {
    const geo = await geocodeAddress(venue_city);
    if (geo) {
      geoFields = {
        lat: geo.lat,
        lng: geo.lng,
        geocoded_address: geo.formattedAddress,
        geocoded_at: new Date().toISOString(),
      };
    }
  }

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
    ...geoFields,
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
        // The onboarding survey itself walks the couple through setup, so the
        // post-survey feature-tour modal would be a second back-to-back
        // walkthrough. Mark it complete on initial wedding creation.
        tour_complete: true,
      })
      .select("id")
      .single();

    if (error || !newWedding) {
      return NextResponse.json({ error: error?.message || "Couldn't create wedding" }, { status: 500 });
    }
    weddingId = newWedding.id;
    await captureServer(userId, "trial_signup", {
      wedding_id: weddingId,
      source: "onboarding",
    });
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
    await supabase.from("onboarding_survey").upsert({
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

    const personalizationCtx = {
      partner1_name,
      partner2_name,
      date,
      venue,
      venue_city,
      budget,
      guest_count_estimate,
      style_description,
      has_wedding_party,
      has_pre_wedding_events,
      has_honeymoon,
      booked_vendors,
    };

    // 1) Deterministic baseline — always weaves the couple's venue, budget,
    //    guest count, date, and style into the tasks where those matter. No
    //    API call, never fails.
    const baseTasks = applyDeterministicMessages(tasks, personalizationCtx);

    // 2) AI pass on top — refines the voice across the whole timeline when
    //    Claude is available. Any failure (no API key, Claude down, malformed
    //    response, timeout) returns the deterministic baseline unchanged, so
    //    personalization survives regardless.
    const personalizedTasks = await personalizeTaskMessages(baseTasks, personalizationCtx);

    const batchSize = 50;
    for (let i = 0; i < personalizedTasks.length; i += batchSize) {
      const batch = personalizedTasks.slice(i, i + batchSize);
      await supabase.from("tasks").insert(batch);
    }
  }

  // Seed budget line items
  const { count: existingExpenses } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("wedding_id", weddingId);

  if (!existingExpenses || existingExpenses === 0) {
    // A category's allocated amount is split evenly across its line items.
    // Without this, every item in a category gets the full category total
    // and the estimated budget balloons to several times the real budget.
    const itemsPerCategory = new Map<string, number>();
    for (const item of BUDGET_TEMPLATE) {
      itemsPerCategory.set(item.category, (itemsPerCategory.get(item.category) ?? 0) + 1);
    }

    const budgetItems = BUDGET_TEMPLATE.map((item) => {
      // If budget allocations were provided, split each category's amount
      // evenly across that category's line items.
      const allocation = budget_allocations?.find((a) => a.category === item.category);
      const count = itemsPerCategory.get(item.category) ?? 1;
      return {
        wedding_id: weddingId,
        description: item.description,
        estimated: allocation ? Math.round(allocation.allocated / count) : 0,
        category: item.category,
        paid: false,
      };
    });

    await supabase.from("expenses").insert(budgetItems);
  }

  return NextResponse.json({ success: true, wedding_id: weddingId }, { status: 201 });
}
