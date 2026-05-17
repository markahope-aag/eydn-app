import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

/**
 * One-shot observability connectivity probe. Verifies both Sentry and Axiom
 * receive events from the production Node serverless runtime. Gated by
 * CRON_SECRET so anonymous traffic can't trigger it. Safe to leave in repo —
 * the runtime is tiny and the route does nothing unless the secret matches.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ts = new Date().toISOString();

  // Axiom probe
  logger.info(
    { event: "observability_smoke_test", ts, source: "eydn-app" },
    "Axiom ingest probe from /api/debug/observability-test"
  );

  // Sentry probe
  const sentryEventId = Sentry.captureMessage(
    `Sentry server-runtime smoke test from /api/debug/observability-test at ${ts}`,
    "info"
  );
  await Sentry.flush(5000);

  return NextResponse.json({
    ok: true,
    ts,
    sentry_event_id: sentryEventId,
    next_runtime: process.env.NEXT_RUNTIME ?? "unknown",
    note: "Check Sentry events feed by id, and orbitabm-app dataset -> 'observability_smoke_test'.",
  });
}
