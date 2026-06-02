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
