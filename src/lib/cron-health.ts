/**
 * Pure logic for the cron dead-man's switch. Given recent cron_log rows, finds
 * jobs that are missing/stale or whose last run errored. Kept separate from the
 * route so it's unit-testable.
 */

export type CronLogRow = {
  job_name: string;
  status: string;
  started_at: string;
  error_message: string | null;
};

// Max hours expected between successful runs of each logged cron (cadence + grace).
export const EXPECTED_MAX_AGE_HOURS: Record<string, number> = {
  "check-deadlines": 26,
  "trial-reminders": 26,
  backup: 26,
  lifecycle: 26,
  "recompute-featured": 26,
  "model-health": 26,
  "geocode-vendors": 3,
  "import-vendors": 3,
  "sync-vendor-photos": 3,
  "storage-cleanup": 200,
  "vendor-reminders": 200,
  indexnow: 200,
  "refresh-vendors": 200,
};

/** Most-recent row per job name. */
export function latestPerJob(rows: CronLogRow[]): Map<string, CronLogRow> {
  const latest = new Map<string, CronLogRow>();
  for (const r of rows) {
    const cur = latest.get(r.job_name);
    if (!cur || new Date(r.started_at).getTime() > new Date(cur.started_at).getTime()) {
      latest.set(r.job_name, r);
    }
  }
  return latest;
}

/**
 * Returns a human-readable issue line for every expected job that hasn't run
 * within its window, has never run, or whose latest run errored.
 */
export function findCronIssues(
  rows: CronLogRow[],
  nowMs: number,
  expected: Record<string, number> = EXPECTED_MAX_AGE_HOURS
): string[] {
  const latest = latestPerJob(rows);
  const issues: string[] = [];

  for (const [job, maxHours] of Object.entries(expected)) {
    const row = latest.get(job);
    if (!row) {
      issues.push(`${job}: no run logged in the last 10 days`);
      continue;
    }
    const ageHours = (nowMs - new Date(row.started_at).getTime()) / 3_600_000;
    if (ageHours > maxHours) {
      issues.push(`${job}: last ran ${ageHours.toFixed(1)}h ago (expected within ${maxHours}h)`);
    } else if (row.status === "error") {
      issues.push(`${job}: last run errored — ${row.error_message || "(no message)"}`);
    }
  }

  return issues;
}
