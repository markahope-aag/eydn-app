import { getWeddingForUser, invalidateWeddingCache } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { TASK_TIMELINE } from "@/lib/tasks/task-timeline";

const ALLOWED_FIELDS = [
  "partner1_name", "partner2_name", "date", "venue", "budget",
  "guest_count_estimate", "style_description",
  "has_wedding_party", "wedding_party_count",
  "has_pre_wedding_events", "has_honeymoon", "key_decisions",
  "shared_attire_note", "ceremony_time",
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

  const { data, error } = await supabase
    .from("weddings")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

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
        // Fetch ALL tasks with due dates — separate into auto-shift vs manual-review
        const { data: allTasks } = await supabase
          .from("tasks")
          .select("id, title, due_date, is_system_generated, completed")
          .eq("wedding_id", id)
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
        .eq("wedding_id", id);

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
  }

  return NextResponse.json({ ...data, _cascaded: cascadeResults });
}
