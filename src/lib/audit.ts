import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AuditAction = "create" | "update" | "delete" | "restore";

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
