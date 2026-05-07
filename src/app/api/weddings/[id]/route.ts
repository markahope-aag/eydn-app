import { getWeddingForUser, invalidateWeddingCache } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError, MAX_MONETARY_AMOUNT, MAX_GUEST_COUNT } from "@/lib/validation";
import { TASK_TIMELINE } from "@/lib/tasks/task-timeline";
import { supabaseError } from "@/lib/api-error";
import { geocodeAddress } from "@/lib/geocoding";

const ALLOWED_FIELDS = [
  "partner1_name", "partner2_name", "date", "venue", "venue_city", "budget",
  "guest_count_estimate", "style_description",
  "has_wedding_party", "wedding_party_count",
  "has_pre_wedding_events", "has_honeymoon", "key_decisions",
  "shared_attire_note", "ceremony_time",
  "rsvp_deadline", "photo_approval_required", "meal_options", "website_theme",
];

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/weddings/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  if (wedding.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const updates = pickFields(body, ALLOWED_FIELDS);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Validate numeric fields — non-negative with reasonable upper bounds
  if (updates.budget !== undefined && updates.budget !== null) {
    const v = updates.budget as number;
    if (v < 0) return NextResponse.json({ error: "Budget cannot be negative" }, { status: 400 });
    if (v > MAX_MONETARY_AMOUNT) return NextResponse.json({ error: `Budget cannot exceed $${MAX_MONETARY_AMOUNT.toLocaleString()}` }, { status: 400 });
  }
  if (updates.guest_count_estimate !== undefined && updates.guest_count_estimate !== null) {
    const v = updates.guest_count_estimate as number;
    if (v < 0) return NextResponse.json({ error: "Guest count cannot be negative" }, { status: 400 });
    if (v > MAX_GUEST_COUNT) return NextResponse.json({ error: `Guest count cannot exceed ${MAX_GUEST_COUNT.toLocaleString()}` }, { status: 400 });
  }

  // Geocode venue_city when it changes so vendor relevance is distance-based.
  // Done before the update so the lat/lng land in the same write.
  let extraUpdates: Record<string, unknown> = {};
  if (
    typeof updates.venue_city !== "undefined" &&
    updates.venue_city !== null &&
    String(updates.venue_city).trim() &&
    String(updates.venue_city).trim() !== (wedding as { venue_city: string | null }).venue_city
  ) {
    const geo = await geocodeAddress(String(updates.venue_city).trim());
    if (geo) {
      extraUpdates = {
        lat: geo.lat,
        lng: geo.lng,
        geocoded_address: geo.formattedAddress,
        geocoded_at: new Date().toISOString(),
      };
    }
  }

  const { data, error } = await supabase
    .from("weddings")
    .update({
      ...updates,
      ...extraUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  const err = supabaseError(error, "weddings");
  if (err) return err;

  // Invalidate cached wedding data so subsequent requests get fresh data
  invalidateWeddingCache(userId);

  const cascadeResults: string[] = [];

  // CASCADE: When wedding date changes, update all dependent dates
  if (updates.date && updates.date !== wedding.date) {
    const newDate = updates.date as string;
    const oldDate = wedding.date;

    // 1. Update rehearsal dinner date to day before new wedding date
    const dayBefore = new Date(newDate + "T12:00:00");
    dayBefore.setDate(dayBefore.getDate() - 1);
    const rehearsalDate = dayBefore.toISOString().slice(0, 10);

    const { error: rehearsalErr } = await supabase
      .from("rehearsal_dinner")
      .update({ date: rehearsalDate })
      .eq("wedding_id", id);

    if (!rehearsalErr) cascadeResults.push("rehearsal_dinner_date");

    // 2. Recalculate all system-generated task due dates
    if (oldDate) {
      const oldWeddingDate = new Date(oldDate + "T12:00:00");
      const newWeddingDate = new Date(newDate + "T12:00:00");
      const dayShift = Math.round((newWeddingDate.getTime() - oldWeddingDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayShift !== 0) {
        // Fetch active tasks with due dates — exclude soft-deleted
        const { data: allTasks } = await supabase
          .from("tasks")
          .select("id, title, due_date, is_system_generated, completed")
          .eq("wedding_id", id)
          .is("deleted_at", null)
          .not("due_date", "is", null);

        if (allTasks && allTasks.length > 0) {
          const autoShift = allTasks.filter((t) => t.is_system_generated && !t.completed);
          const needsReview = allTasks.filter((t) => !t.is_system_generated || t.completed);

          // Auto-shift system-generated incomplete tasks
          for (const task of autoShift) {
            const oldDue = new Date(task.due_date + "T12:00:00");
            oldDue.setDate(oldDue.getDate() + dayShift);
            const newDue = oldDue.toISOString().slice(0, 10);
            await supabase
              .from("tasks")
              .update({ due_date: newDue })
              .eq("id", task.id);
          }
          if (autoShift.length > 0) cascadeResults.push(`tasks_shifted_${autoShift.length}`);

          // Flag tasks that need manual review (user-created or completed)
          if (needsReview.length > 0) {
            cascadeResults.push(`tasks_need_review_${needsReview.length}`);
            // Return the list so the frontend can display them
            (data as Record<string, unknown>)._tasks_needing_review = needsReview.map((t) => ({
              id: t.id,
              title: t.title,
              due_date: t.due_date,
            }));
          }
        }
      }
    } else {
      // No old date — calculate system-generated from scratch, flag user-created
      const newWeddingDate = new Date(newDate + "T12:00:00");
      const { data: allTasks } = await supabase
        .from("tasks")
        .select("id, title, due_date, is_system_generated, completed")
        .eq("wedding_id", id)
        .is("deleted_at", null);

      if (allTasks && allTasks.length > 0) {
        const monthsMap = new Map<string, number>();
        for (const t of TASK_TIMELINE) {
          monthsMap.set(t.title, t.monthsBefore);
          if (t.subTasks) {
            for (const s of t.subTasks) monthsMap.set(s.title, s.monthsBefore);
          }
        }

        let recalculated = 0;
        const needsReview: { id: string; title: string; due_date: string | null }[] = [];

        for (const task of allTasks) {
          if (task.is_system_generated && !task.completed) {
            const months = monthsMap.get(task.title);
            if (months !== undefined) {
              const d = new Date(newWeddingDate);
              d.setMonth(d.getMonth() - Math.floor(months));
              const frac = months - Math.floor(months);
              if (frac) d.setDate(d.getDate() - Math.round(frac * 30));
              await supabase
                .from("tasks")
                .update({ due_date: d.toISOString().slice(0, 10) })
                .eq("id", task.id);
              recalculated++;
            }
          } else if (task.due_date) {
            needsReview.push({ id: task.id, title: task.title, due_date: task.due_date });
          }
        }

        if (recalculated > 0) cascadeResults.push(`tasks_recalculated_${recalculated}`);
        if (needsReview.length > 0) {
          cascadeResults.push(`tasks_need_review_${needsReview.length}`);
          (data as Record<string, unknown>)._tasks_needing_review = needsReview;
        }
      }
    }

    // 3. Create a date change alert for the user to acknowledge
    const reviewTasks = (data as Record<string, unknown>)._tasks_needing_review as { title: string }[] | undefined;
    const alertMessage = reviewTasks && reviewTasks.length > 0
      ? `Your wedding date changed from ${oldDate || "unset"} to ${newDate}. Your rehearsal dinner and planning milestones have been updated automatically. However, ${reviewTasks.length} task(s) may have appointments that need rescheduling — please review and update them with your vendors.`
      : `Your wedding date changed from ${oldDate || "unset"} to ${newDate}. Your rehearsal dinner date and all planning milestone dates have been updated automatically.`;

    await supabase.from("date_change_alerts").insert({
      wedding_id: id,
      change_type: "wedding_date",
      old_value: oldDate,
      new_value: newDate,
      affected_tasks: (reviewTasks || []) as import("@/lib/supabase/types").Json,
      message: alertMessage,
    });
  }

  // CASCADE: When ceremony_time changes, sync to day_of_plans
  if (updates.ceremony_time !== undefined) {
    const { data: dayOfPlan } = await supabase
      .from("day_of_plans")
      .select("id, content")
      .eq("wedding_id", id)
      .single();

    if (dayOfPlan) {
      const content = dayOfPlan.content as Record<string, unknown>;
      content.ceremonyTime = updates.ceremony_time;
      await supabase
        .from("day_of_plans")
        .update({ content: content as import("@/lib/supabase/types").Json })
        .eq("id", dayOfPlan.id);
      cascadeResults.push("day_of_ceremony_time");
    }

    // Create ceremony time change alert
    const oldCeremonyTime = (wedding as Record<string, unknown>).ceremony_time as string || null;
    if (updates.ceremony_time !== oldCeremonyTime) {
      await supabase.from("date_change_alerts").insert({
        wedding_id: id,
        change_type: "ceremony_time",
        old_value: oldCeremonyTime,
        new_value: updates.ceremony_time as string,
        affected_tasks: [] as import("@/lib/supabase/types").Json,
        message: `Your ceremony time changed from ${oldCeremonyTime || "unset"} to ${updates.ceremony_time}. Your day-of timeline has been synced. Make sure any vendor arrival times, hair & makeup schedules, and photo sessions reflect the new timing.`,
      });
    }
  }

  return NextResponse.json({ ...data, _cascaded: cascadeResults });
}
