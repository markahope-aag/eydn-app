/**
 * Shared Cadence subscribe helper.
 * Cadence is our in-house bulk-email system backed by AWS SES. Every
 * lead-capture surface on eydn.app (newsletter signup, calculator save,
 * quiz completion) pushes contacts into the matching Cadence contact
 * list via the public /api/subscribe form endpoint.
 *
 * Returns a structured result so callers can record success/failure
 * (e.g. calculator-save writes the outcome back to calculator_saves so
 * silent misconfigurations stop being invisible). Existing callers that
 * don't care can ignore the return value — there's no exception path
 * that would change their behavior.
 */

type CadenceSubscribeInput = {
  /** Destination subscribe-form UUID inside Cadence. */
  formId: string;
  /** Normalized email (lowercased, trimmed). */
  email: string;
  /** Optional first name for personalization. */
  firstName?: string | null;
};

export type CadenceSubscribeResult =
  | { status: "ok" }
  | { status: "skipped"; reason: string }
  | { status: "error"; error: string };

export async function cadenceSubscribe(input: CadenceSubscribeInput): Promise<CadenceSubscribeResult> {
  const cadenceUrl = process.env.CADENCE_URL;
  if (!cadenceUrl) {
    return { status: "skipped", reason: "CADENCE_URL not configured" };
  }
  if (!input.formId) {
    return { status: "skipped", reason: "formId missing — env var likely unset" };
  }

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
      const msg = `HTTP ${res.status}: ${body.slice(0, 200)}`;
      console.error(`[CADENCE] sync failed ${msg}`);
      return { status: "error", error: msg };
    }
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CADENCE] sync error:", msg);
    return { status: "error", error: msg };
  }
}
