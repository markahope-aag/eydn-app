import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Log a cron job execution to the cron_log table.
 */
export async function logCronExecution(params: {
  jobName: string;
  status: "success" | "error";
  durationMs: number;
  details?: import("@/lib/supabase/types").Json;
  errorMessage?: string;
}) {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("cron_log")
    .insert({
      job_name: params.jobName,
      status: params.status,
      duration_ms: params.durationMs,
      details: (params.details ?? null) as import("@/lib/supabase/types").Json,
      error_message: params.errorMessage || null,
    })
    .then(({ error }) => { if (error) console.error("[CRON-LOG]", error.message); });
}
