import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  // Get last 50 cron executions
  const { data: executions } = await supabase
    .from("cron_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  // Get per-job stats
  const jobs = ["backup", "lifecycle", "check-deadlines", "storage-cleanup", "vendor-reminders"];
  const jobStats: Record<string, {
    lastRun: string | null;
    lastStatus: string | null;
    lastDuration: number | null;
    successCount: number;
    errorCount: number;
  }> = {};

  for (const job of jobs) {
    const jobRuns = (executions || []).filter(
      (e: Record<string, unknown>) => e.job_name === job
    );
    const last = jobRuns[0] as Record<string, unknown> | undefined;
    jobStats[job] = {
      lastRun: (last?.started_at as string) || null,
      lastStatus: (last?.status as string) || null,
      lastDuration: (last?.duration_ms as number) || null,
      successCount: jobRuns.filter((e: Record<string, unknown>) => e.status === "success").length,
      errorCount: jobRuns.filter((e: Record<string, unknown>) => e.status === "error").length,
    };
  }

  // Get cron schedule info
  const cronJobs = [
    { name: "backup", schedule: "0 3 * * *", description: "Off-platform data backup to Hetzner via SFTP" },
    { name: "lifecycle", schedule: "0 4 * * *", description: "Wedding phase transitions and lifecycle emails" },
    { name: "check-deadlines", schedule: "0 9 * * *", description: "Task deadline reminders and notifications" },
    { name: "storage-cleanup", schedule: "0 5 * * 0", description: "Clean up orphaned storage files" },
    { name: "vendor-reminders", schedule: "0 10 * * 1", description: "Weekly vendor payment reminders" },
  ];

  return NextResponse.json({
    jobs: cronJobs.map((j) => ({ ...j, stats: jobStats[j.name] })),
    recentExecutions: executions || [],
  });
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const body = await request.json();
  const jobName = body.job as string;

  // Map job names to their API routes
  const routes: Record<string, string> = {
    "backup": "/api/cron/backup",
    "lifecycle": "/api/cron/lifecycle",
    "check-deadlines": "/api/cron/check-deadlines",
    "storage-cleanup": "/api/cron/storage-cleanup",
    "vendor-reminders": "/api/cron/vendor-reminders",
  };

  const route = routes[jobName];
  if (!route) {
    return NextResponse.json({ error: "Unknown job name" }, { status: 400 });
  }

  // Trigger the cron via internal fetch with the appropriate secret
  const secret = ["backup", "lifecycle"].includes(jobName)
    ? process.env.BACKUP_SECRET
    : process.env.CRON_SECRET;

  const res = await fetch(new URL(route, request.url).toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({
    success: res.ok,
    status: res.status,
    job: jobName,
    result: data,
  });
}
