import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { runScraperImport } from "@/lib/scraper-import";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * POST /api/webhooks/scraper
 *
 * Receives webhook events from the external scraper. The scraper signs every
 * request with HMAC-SHA256 over the raw body using a shared secret stored on
 * its side; we verify with the same secret in `SCRAPER_WEBHOOK_SECRET`.
 *
 * Header: `X-Webhook-Signature: <hex>` (no scheme prefix — matches the
 * scraper's lib/integrations/webhooks.ts:38 implementation).
 *
 * Payload shape:
 *   { event: 'job.complete' | 'job.failed' | 'test',
 *     job_id, client_id, results, timestamp }
 *
 * On `job.complete` for our client_id, we trigger the same import logic
 * as the hourly cron — closes the latency gap from "up to 1 hour" to
 * "near-real-time" without losing the safety net of the cron.
 *
 * `test` and `job.failed` are accepted but no-op (logged for audit only).
 */
export async function POST(request: Request) {
  const secret = process.env.SCRAPER_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SCRAPER_WEBHOOK_SECRET not configured on this environment" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("x-webhook-signature");
  const body = await request.text();

  if (!verifyWebhookSignature(body, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; job_id?: string; client_id?: string; timestamp?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  const clientId = payload.client_id;
  console.info(`[WEBHOOK-SCRAPER] event=${event} job_id=${payload.job_id} client_id=${clientId}`);

  // Test pings + failure events: ack without doing work.
  if (event !== "job.complete") {
    return NextResponse.json({ ok: true, note: `event '${event}' acknowledged, no import triggered` });
  }

  // Only trigger an import for *our* client_id — the scraper is multi-tenant.
  const ourClientId = process.env.SCRAPER_EYDN_CLIENT_ID;
  if (clientId && ourClientId && clientId !== ourClientId) {
    return NextResponse.json({ ok: true, note: "different client_id, ignored" });
  }

  const scraperUrl = process.env.SCRAPER_SUPABASE_URL;
  const scraperKey = process.env.SCRAPER_SUPABASE_KEY;
  if (!scraperUrl || !scraperKey || !ourClientId) {
    return NextResponse.json(
      { ok: true, skipped: true, note: "scraper credentials not configured" }
    );
  }

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();
  try {
    const result = await runScraperImport(supabase, scraperUrl, scraperKey, ourClientId);
    await logCronExecution({
      jobName: "import-vendors-webhook",
      status: result.errors.length > 0 ? "error" : "success",
      durationMs: Date.now() - startTime,
      details: result as unknown as import("@/lib/supabase/types").Json,
      errorMessage: result.errors[0],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WEBHOOK-SCRAPER] import failed:", message);
    await logCronExecution({
      jobName: "import-vendors-webhook",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
