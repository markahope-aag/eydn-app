import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { logCronExecution } from "@/lib/cron-logger";
import { alertOpsCritical } from "@/lib/ops-alert";
import { escapeHtml } from "@/lib/validation";
import { verifyLatestBackup } from "@/lib/backup/verify";

/**
 * Nightly backup watchdog. Runs a couple of hours after the backup cron and
 * independently confirms last night's backup actually worked: it reads the
 * latest object back out of R2, parses it, and checks it is recent, non-trivial
 * and contains the weddings we expect. It also checks the backup job's own
 * cron_log row for a same-day error.
 *
 * If ANYTHING looks wrong it fires a CRITICAL alert (email + loud webhook), so
 * a failed or empty backup never passes silently. On success it logs quietly.
 *
 * Schedule: 0 6 * * * (06:00 UTC — backup runs at 03:00 UTC).
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  try {
    const supabase = createSupabaseAdmin();

    const [{ count: liveWeddingCount }, { data: lastBackup }] = await Promise.all([
      supabase.from("weddings").select("*", { count: "exact", head: true }),
      supabase
        .from("cron_log")
        .select("status, started_at, error_message")
        .eq("job_name", "backup")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const verification = await verifyLatestBackup(liveWeddingCount ?? 0, Date.now());
    const problems = [...verification.problems];

    // Catch a same-day backup job error even when yesterday's object is still
    // within the freshness window.
    if (lastBackup?.status === "error") {
      problems.push(`The most recent backup job reported an error: ${lastBackup.error_message || "(no message)"}`);
    } else if (!lastBackup) {
      problems.push("No backup job has ever been logged.");
    }

    const ok = problems.length === 0;

    if (!ok) {
      const list = problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
      await alertOpsCritical(
        "🚨 CRITICAL: nightly backup verification FAILED — user data may be unprotected",
        `<h2 style="color:#b00020">Nightly backup check FAILED</h2>
         <p>The automated watchdog could not confirm a good off-platform backup. Until this is resolved, recent user data may not be recoverable.</p>
         <p><strong>Problems found:</strong></p>
         <ul>${list}</ul>
         <p><strong>Latest backup seen:</strong> ${escapeHtml(verification.latestKey || "none")}${
           verification.bytes != null ? ` (${(verification.bytes / 1024).toFixed(0)} KB` : ""
         }${verification.ageHours != null ? `, ${verification.ageHours.toFixed(1)}h old)` : verification.bytes != null ? ")" : ""}</p>
         <p>Check the admin <strong>Data &amp; Security</strong> tab, then run a manual backup and re-check. Restore runbook: docs/OPERATIONS_MANUAL.md.</p>`,
        `CRITICAL: Eydn nightly backup verification FAILED. ${problems.join(" | ")}`
      );
    }

    await logCronExecution({
      jobName: "backup-watchdog",
      status: ok ? "success" : "error",
      durationMs: Date.now() - startedAt,
      details: {
        ok,
        latestKey: verification.latestKey,
        ageHours: verification.ageHours,
        bytes: verification.bytes,
        weddingCount: verification.weddingCount,
        liveWeddingCount: verification.liveWeddingCount,
        problems,
      },
      errorMessage: ok ? undefined : problems.join(" | "),
    });

    return NextResponse.json({ ...verification, ok, problems });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    // A watchdog that itself crashes must be loud too — silence looks like health.
    await alertOpsCritical(
      "🚨 CRITICAL: backup watchdog crashed — backup status UNKNOWN",
      `<h2 style="color:#b00020">Backup watchdog crashed</h2>
       <p>The nightly backup verification could not complete, so the backup status is unknown.</p>
       <p><strong>Error:</strong> ${escapeHtml(message)}</p>`,
      `CRITICAL: Eydn backup watchdog crashed — backup status unknown. ${message}`
    );
    await logCronExecution({
      jobName: "backup-watchdog",
      status: "error",
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Allow the admin UI to trigger an on-demand verification too.
export const POST = GET;
