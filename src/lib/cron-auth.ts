import { NextResponse } from "next/server";

/**
 * Shared bearer-token guard for every /api/cron/* route.
 *
 * Accepts either CRON_SECRET or BACKUP_SECRET so the existing split can be
 * deprecated gradually — set both env vars in Vercel, rotate one at a time,
 * then drop the other once all schedules are healthy. Long-term both should
 * collapse to CRON_SECRET.
 *
 * Returns null when the request is authorized; otherwise returns a 401
 * NextResponse the caller should early-return.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const backupSecret = process.env.BACKUP_SECRET;

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matchesCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const matchesBackup = backupSecret && authHeader === `Bearer ${backupSecret}`;

  if (!matchesCron && !matchesBackup) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // At least one secret must be configured — otherwise every request would
  // pass as soon as an empty header matched an empty string.
  if (!cronSecret && !backupSecret) {
    return NextResponse.json({ error: "Cron auth not configured" }, { status: 500 });
  }

  return null;
}
