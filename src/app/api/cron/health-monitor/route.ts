import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { logCronExecution } from "@/lib/cron-logger";
import { alertOps } from "@/lib/ops-alert";
import { escapeHtml } from "@/lib/validation";
import { findCronIssues, EXPECTED_MAX_AGE_HOURS, type CronLogRow } from "@/lib/cron-health";

/**
 * Dead-man's switch for the scheduled jobs. A cron that *fails* logs an error
 * row (and alerts in real time via the cron logger); this catches the silent
 * case — a cron that didn't run at all leaves no row. Runs daily, compares the
 * latest cron_log entry per job against its expected cadence, and emails ops if
 * any job is missing/stale or last errored.
 *
 * Only covers crons that write to cron_log. Schedule: 0 16 * * * (16:00 UTC).
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  try {
    const supabase = createSupabaseAdmin();
    // 10-day window comfortably covers weekly jobs.
    const since = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("cron_log")
      .select("job_name, status, started_at, error_message")
      .gte("started_at", since)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);

    const issues = findCronIssues((data ?? []) as CronLogRow[], Date.now());

    if (issues.length > 0) {
      await alertOps(
        `${issues.length} cron issue${issues.length === 1 ? "" : "s"} detected`,
        `<p>The daily health monitor found the following:</p>
         <ul>${issues.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
         <p>Check the admin Cron Jobs tab.</p>`
      );
    }

    await logCronExecution({
      jobName: "health-monitor",
      status: "success",
      durationMs: Date.now() - startedAt,
      details: { checked: Object.keys(EXPECTED_MAX_AGE_HOURS).length, issues: issues.length },
    });

    return NextResponse.json({ ok: true, checked: Object.keys(EXPECTED_MAX_AGE_HOURS).length, issues });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    await logCronExecution({
      jobName: "health-monitor",
      status: "error",
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
