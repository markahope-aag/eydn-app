import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type AuditAction = "create" | "update" | "delete" | "restore";

const TRIVIAL_ENTITY_TYPES = new Set(["chat_messages", "settings"]);

const ENTITY_TYPE_LABELS: Record<string, string> = {
  guests: "Guest list",
  vendors: "Vendor",
  tasks: "Task",
  budget_items: "Budget",
  wedding_party: "Wedding party",
  timeline_events: "Timeline",
};

/**
 * Notify all collaborators (and wedding owner) about an edit,
 * except the person who made the change.
 * Fire-and-forget — never blocks the request.
 */
export function notifyCollaborators(params: {
  weddingId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityName?: string;
}) {
  if (TRIVIAL_ENTITY_TYPES.has(params.entityType)) return;

  const label = ENTITY_TYPE_LABELS[params.entityType] || params.entityType;
  const title = `${label} updated`;

  const actionVerb = params.action === "create" ? "added" : params.action === "delete" ? "removed" : "updated";
  const namePart = params.entityName ? ` '${params.entityName}'` : "";
  const body = `A collaborator ${actionVerb}${namePart}${params.entityType === "guests" ? " to the guest list" : ""}`;

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return; // Gracefully skip if admin client unavailable (e.g. in tests)
  }

  void (async () => {
    try {
      // Get the wedding owner
      const { data: wedding } = await admin
        .from("weddings")
        .select("user_id")
        .eq("id", params.weddingId)
        .single();

      // Get all collaborators with a linked user_id
      const { data: collabs } = await admin
        .from("wedding_collaborators")
        .select("user_id")
        .eq("wedding_id", params.weddingId)
        .not("user_id", "is", null);

      // Build the set of all user IDs involved, minus the actor
      const recipientIds = new Set<string>();
      if (wedding?.user_id && wedding.user_id !== params.actorUserId) {
        recipientIds.add(wedding.user_id);
      }
      for (const c of collabs || []) {
        if (c.user_id && c.user_id !== params.actorUserId) {
          recipientIds.add(c.user_id);
        }
      }

      if (recipientIds.size === 0) return;

      // Create one notification per recipient — all tied to the same wedding
      const notifications = Array.from(recipientIds).map(() => ({
        wedding_id: params.weddingId,
        type: "collaborator_edit",
        title,
        body,
      }));

      const { error } = await admin.from("notifications").insert(notifications);
      if (error) console.error("[COLLAB-NOTIFY]", error.message);
    } catch (err) {
      console.error("[COLLAB-NOTIFY] Unexpected error:", err);
    }
  })();
}

/**
 * Log an activity event for audit trail.
 * Fire-and-forget — never blocks the request.
 */
export function logActivity(
  supabase: SupabaseClient<Database>,
  params: {
    weddingId: string;
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    entityName?: string;
    details?: Record<string, unknown>;
  }
) {
  void supabase
    .from("activity_log")
    .insert({
      wedding_id: params.weddingId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName || null,
      details: (params.details || null) as import("@/lib/supabase/types").Json,
    })
    .then(({ error }) => {
      if (error) console.error("[AUDIT] Failed to log activity:", error.message);
    });
}

/**
 * Soft-delete a record by setting deleted_at instead of removing it.
 */
export async function softDelete(
  supabase: SupabaseClient<Database>,
  table: string,
  id: string,
  weddingId: string
): Promise<{ error: { message: string } | null }> {
  const { error } = await (supabase as unknown as SupabaseClient)
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("wedding_id", weddingId);

  return { error: error ? { message: error.message } : null };
}

/**
 * Restore a soft-deleted record.
 */
export async function restoreRecord(
  supabase: SupabaseClient<Database>,
  table: string,
  id: string,
  weddingId: string
): Promise<{ error: { message: string } | null }> {
  const { error } = await (supabase as unknown as SupabaseClient)
    .from(table)
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("wedding_id", weddingId);

  return { error: error ? { message: error.message } : null };
}
