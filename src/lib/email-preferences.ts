import { createSupabaseAdmin } from "@/lib/supabase/server";

type EmailPrefs = {
  marketing_emails: boolean;
  deadline_reminders: boolean;
  lifecycle_emails: boolean;
  unsubscribed_all: boolean;
  unsubscribe_token: string;
};

/**
 * Get or create email preferences for a wedding.
 * Auto-creates a row with defaults + unique unsubscribe token if none exists.
 */
export async function getEmailPreferences(weddingId: string): Promise<EmailPrefs> {
  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase
    .from("email_preferences")
    .select("marketing_emails, deadline_reminders, lifecycle_emails, unsubscribed_all, unsubscribe_token")
    .eq("wedding_id", weddingId)
    .single();

  if (existing) return existing as EmailPrefs;

  // Auto-create with defaults
  const { data: created } = await supabase
    .from("email_preferences")
    .upsert({ wedding_id: weddingId }, { onConflict: "wedding_id" })
    .select("marketing_emails, deadline_reminders, lifecycle_emails, unsubscribed_all, unsubscribe_token")
    .single();

  return (created as EmailPrefs) || {
    marketing_emails: true,
    deadline_reminders: true,
    lifecycle_emails: true,
    unsubscribed_all: false,
    unsubscribe_token: "",
  };
}

/**
 * Build unsubscribe URL for email footer.
 */
export function buildUnsubscribeUrl(token: string, type: "all" | "marketing" | "deadlines" | "lifecycle" = "all"): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";
  return `${base}/api/public/unsubscribe?token=${token}&type=${type}`;
}

/**
 * CAN-SPAM compliant email footer with unsubscribe link and physical address.
 */
export function emailFooterHtml(unsubscribeToken: string, type: "marketing" | "deadlines" | "lifecycle" = "marketing"): string {
  const unsubUrl = buildUnsubscribeUrl(unsubscribeToken, type);
  const unsubAllUrl = buildUnsubscribeUrl(unsubscribeToken, "all");

  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #EDE7DF;text-align:center;font-size:12px;color:#6B6B6B;line-height:1.6;">
      <p>eydn — Your AI Wedding Planning Guide</p>
      <p style="margin-top:8px;">
        <a href="${unsubUrl}" style="color:#6B6B6B;text-decoration:underline;">Unsubscribe from these emails</a>
        &nbsp;·&nbsp;
        <a href="${unsubAllUrl}" style="color:#6B6B6B;text-decoration:underline;">Unsubscribe from all</a>
        &nbsp;·&nbsp;
        <a href="https://eydn.app/dashboard/settings" style="color:#6B6B6B;text-decoration:underline;">Manage preferences</a>
      </p>
      <p style="margin-top:8px;">Asymmetric Marketing Group LLC, 100 S Baldwin St Ste 304, Madison WI 53703</p>
    </div>
  `;
}
