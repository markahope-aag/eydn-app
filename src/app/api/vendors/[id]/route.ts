import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { pickFields, safeParseJSON, isParseError } from "@/lib/validation";
import { softDelete, logActivity } from "@/lib/audit";
import { supabaseError } from "@/lib/api-error";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_FIELDS = [
  "name", "category", "status", "poc_name", "poc_email", "poc_phone",
  "notes", "amount", "amount_paid", "arrival_time", "meal_count", "insurance_submitted",
];

// Vendor statuses that mean "this vendor is locked in." Used to detect the
// transition that should auto-complete the matching "Book {category}" task.
const BOOKED_STATES = new Set(["booked", "deposit_paid", "paid_in_full"]);

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/vendors/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;
  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;
  const updates = pickFields(body, ALLOWED_FIELDS);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Capture pre-update status so we can tell when a vendor is *newly* booked
  // (transition into BOOKED_STATES). Re-saving an already-booked vendor must
  // not re-fire the task auto-complete or we'd churn the audit trail.
  const { data: existing } = await supabase
    .from("vendors")
    .select("status")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .maybeSingle();
  const previousStatus = existing?.status ?? null;

  const { data, error } = await supabase
    .from("vendors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .select()
    .single();

  const err = supabaseError(error, "vendors");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "update", entityType: "vendors", entityId: id, entityName: (data as Record<string, unknown>).name as string });

  // Auto-complete the matching "Book {Category}" task when the vendor moves
  // into a booked state for the first time. Couples bookmark these "Book the
  // venue / photographer / florist" tasks from the system-generated timeline,
  // and ticking them off by hand after every booking is busywork.
  const newStatus = (data as { status?: string }).status;
  const newCategory = (data as { category?: string }).category;
  const justBooked =
    newStatus !== undefined &&
    BOOKED_STATES.has(newStatus) &&
    (previousStatus === null || !BOOKED_STATES.has(previousStatus));

  if (justBooked && newCategory) {
    await autoCompleteBookingTasks(supabase, wedding.id, newCategory);
  }

  return NextResponse.json(data);
}

/**
 * Mark every incomplete "Book …" task whose title contains the vendor's
 * category as completed. Title-substring match (rather than a foreign key)
 * because the timeline-generated tasks predate vendor rows and aren't
 * formally linked. We filter in JS to avoid escaping LIKE wildcards in
 * user-supplied category names.
 */
async function autoCompleteBookingTasks(
  supabase: SupabaseClient<Database>,
  weddingId: string,
  category: string
) {
  const { data: candidates } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("wedding_id", weddingId)
    .eq("completed", false)
    .is("deleted_at", null)
    .ilike("title", "Book %");

  const needle = category.toLowerCase();
  const ids = (candidates ?? [])
    .filter((t) => (t.title ?? "").toLowerCase().includes(needle))
    .map((t) => t.id);

  if (ids.length === 0) return;

  await supabase
    .from("tasks")
    .update({ completed: true, status: "done" })
    .in("id", ids);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/vendors/[id]">
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const { id } = await ctx.params;

  const { error } = await softDelete(supabase, "vendors", id, wedding.id);

  const err = supabaseError(error, "vendors");
  if (err) return err;

  logActivity(supabase, { weddingId: wedding.id, userId, action: "delete", entityType: "vendors", entityId: id });

  return NextResponse.json({ success: true });
}
