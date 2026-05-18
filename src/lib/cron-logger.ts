import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Log a cron job execution to the cron_log table AND ship a structured
 * event to Axiom. Every cron route in this app calls this once at the
 * end of its handler — so a single change here flows observability to
 * all 14+ crons without touching them individually.
 */
export async function logCronExecution(params: {
  jobName: string;
  status: "success" | "error";
  durationMs: number;
  details?: import("@/lib/supabase/types").Json;
  errorMessage?: string;
}) {
  // Structured log → Axiom + Vercel stdout
  const logFn = params.status === "error" ? logger.error.bind(logger) : logger.info.bind(logger);
  logFn(
    {
      event: "cron_execution",
      job_name: params.jobName,
      status: params.status,
      duration_ms: params.durationMs,
      details: params.details ?? undefined,
      error_message: params.errorMessage || undefined,
    },
    `cron ${params.jobName} ${params.status} in ${params.durationMs}ms`,
  );

  // Persist to Supabase (existing behavior)
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
