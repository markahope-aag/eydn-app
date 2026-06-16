import { sendEmail } from "@/lib/email";

/**
 * Email every address in ADMIN_EMAILS with an operational alert. Best-effort —
 * never throws, so callers (e.g. the cron logger) can fire it without risking
 * the job itself. No-op when ADMIN_EMAILS is unset.
 */
export async function alertOps(subject: string, html: string): Promise<void> {
  const recipients = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: `[Eydn ops] ${subject}`,
        html,
        category: "transactional",
      }).catch(() => {})
    )
  );
}

/**
 * POST a plain-text alert to OPS_ALERT_WEBHOOK_URL if configured. The body
 * carries the message under several common keys so the same URL works for
 * Slack (`text`), Discord (`content`), and generic webhooks (`message`) —
 * point it at whatever channel makes the loudest noise (Slack, a phone push
 * via Pushover/ntfy, an SMS gateway, PagerDuty, etc.). Best-effort.
 */
export async function alertWebhook(message: string): Promise<void> {
  const url = process.env.OPS_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message, content: message, message }),
    });
  } catch {
    // never throw from an alert path
  }
}

/**
 * Highest-severity alert: fan out to BOTH the admin email list and the
 * loud webhook channel. Use for things that need someone woken up — e.g. a
 * failed nightly backup that leaves user data unprotected.
 */
export async function alertOpsCritical(
  subject: string,
  html: string,
  plainText?: string
): Promise<void> {
  await Promise.all([
    alertOps(subject, html),
    alertWebhook(plainText ?? subject),
  ]);
}
