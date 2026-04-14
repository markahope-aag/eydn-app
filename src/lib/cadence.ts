/**
 * Shared Cadence subscribe helper.
 * Cadence is our in-house bulk-email system backed by AWS SES. Every
 * lead-capture surface on eydn.app (newsletter signup, calculator save,
 * quiz completion) pushes contacts into the matching Cadence contact
 * list via the public /api/subscribe form endpoint.
 *
 * All calls are fire-and-forget: if the sync fails or the env vars
 * aren't configured, we log and return — never block the user response.
 */

type CadenceSubscribeInput = {
  /** Destination subscribe-form UUID inside Cadence. */
  formId: string;
  /** Normalized email (lowercased, trimmed). */
  email: string;
  /** Optional first name for personalization. */
  firstName?: string | null;
};

export async function cadenceSubscribe(input: CadenceSubscribeInput): Promise<void> {
  const cadenceUrl = process.env.CADENCE_URL;
  if (!cadenceUrl || !input.formId) return;

  try {
    const res = await fetch(`${cadenceUrl.replace(/\/$/, "")}/api/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: input.formId,
        email: input.email,
        first_name: input.firstName || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[CADENCE] sync failed ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[CADENCE] sync error:", err instanceof Error ? err.message : err);
  }
}
