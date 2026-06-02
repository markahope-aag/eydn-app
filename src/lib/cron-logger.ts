import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { alertOps } from "@/lib/ops-alert";
import { escapeHtml } from "@/lib/validation";

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

  // Real-time alert to ops on failure. Best-effort — never blocks the job.
  if (params.status === "error") {
    await alertOps(
      `Cron failed: ${params.jobName}`,
      `<p>The scheduled job <strong>${escapeHtml(params.jobName)}</strong> reported a failure.</p>
       <p><strong>Duration:</strong> ${params.durationMs}ms</p>
       <p><strong>Error:</strong> ${escapeHtml(params.errorMessage || "(no message)")}</p>
       <p>Check the admin Cron Jobs tab and Sentry for detail.</p>`
    );
  }
}
