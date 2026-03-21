import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Log a cron job execution to the cron_log table.
 */
export async function logCronExecution(params: {
  jobName: string;
  status: "success" | "error";
  durationMs: number;
  details?: Record<string, unknown>;
  errorMessage?: string;
}) {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("cron_log")
    .insert({
      job_name: params.jobName,
      status: params.status,
      duration_ms: params.durationMs,
      details: params.details || null,
      error_message: params.errorMessage || null,
    })
    .then(() => {});
}
