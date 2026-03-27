/**
 * SMS notifications via Twilio.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  (the "from" number, e.g. +1234567890)
 *
 * Usage:
 *   await sendSMS("+1555123456", "Your wedding is in 7 days!");
 *   await smsToWedding(supabase, weddingId, "Reminder: cake tasting tomorrow");
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

type SMSResult = { success: boolean; error?: string };

export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    // Gracefully skip if Twilio is not configured
    return { success: false, error: "Twilio not configured" };
  }

  // Normalize phone number — must be E.164 format
  const normalized = normalizePhone(to);
  if (!normalized) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    // Dynamic import to avoid loading Twilio when not configured
    const twilio = await import("twilio");
    const client = twilio.default(ACCOUNT_SID, AUTH_TOKEN);
    await client.messages.create({
      to: normalized,
      from: FROM_NUMBER,
      body: body.slice(0, 1600), // Twilio max
    });
    return { success: true };
  } catch (error) {
    console.error("[SMS] Send failed:", error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send SMS to wedding owner(s) by looking up their phone from Clerk.
 * Falls back gracefully if no phone is on file.
 */
export async function smsToWedding(
  supabase: { from: (table: string) => unknown },
  weddingId: string,
  body: string
): Promise<number> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) return 0;

  // Get wedding owner's user_id
  const sb = supabase as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: { user_id: string } | null }> } } } };
  const { data: wedding } = await sb
    .from("weddings")
    .select("user_id")
    .eq("id", weddingId)
    .single();

  if (!wedding) return 0;

  try {
    // Get phone from Clerk user profile
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(wedding.user_id);
    const phone = user.primaryPhoneNumber?.phoneNumber;
    if (!phone) return 0;

    const result = await sendSMS(phone, body);
    return result.success ? 1 : 0;
  } catch {
    return 0;
  }
}

/**
 * Normalize a US phone number to E.164 format.
 * Returns null if the number can't be normalized.
 */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.startsWith("+") && digits.length >= 11) return input.replace(/\s/g, "");
  if (input.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}
