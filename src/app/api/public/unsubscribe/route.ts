import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Public unsubscribe endpoint — no authentication required (CAN-SPAM compliance).
 * GET: renders unsubscribe confirmation
 * POST: processes the unsubscribe
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type") || "all";

  if (!token) {
    return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or has expired."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createSupabaseAdmin();
  const { data: pref } = await supabase
    .from("email_preferences")
    .select("wedding_id, unsubscribed_all, marketing_emails, deadline_reminders, lifecycle_emails")
    .eq("unsubscribe_token", token)
    .single();

  if (!pref) {
    return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or has expired."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if ((pref as { unsubscribed_all: boolean }).unsubscribed_all) {
    return new Response(renderPage("Already Unsubscribed", "You have already been unsubscribed from all Eydn emails."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const typeLabel = type === "marketing" ? "marketing emails"
    : type === "deadlines" ? "deadline reminders"
    : type === "lifecycle" ? "lifecycle emails"
    : "all emails";

  return new Response(
    renderPage(
      "Unsubscribe",
      `<p>Click below to unsubscribe from <strong>${typeLabel}</strong>.</p>
       <form method="POST" action="/api/public/unsubscribe">
         <input type="hidden" name="token" value="${token}" />
         <input type="hidden" name="type" value="${type}" />
         <button type="submit" style="background:#2C3E2D;color:#fff;border:none;padding:12px 28px;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;margin-top:16px;">
           Unsubscribe
         </button>
       </form>
       <p style="margin-top:16px;font-size:13px;color:#6B6B6B;">You can also manage your email preferences in your <a href="https://eydn.app/dashboard/settings" style="color:#2C3E2D;">Eydn dashboard</a>.</p>`
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get("token") as string;
  const type = formData.get("type") as string || "all";

  if (!token) {
    return new Response(renderPage("Error", "Missing unsubscribe token."), {
      headers: { "Content-Type": "text/html" }, status: 400,
    });
  }

  const supabase = createSupabaseAdmin();

  const { data: pref } = await supabase
    .from("email_preferences")
    .select("id")
    .eq("unsubscribe_token", token)
    .single();

  if (!pref) {
    return new Response(renderPage("Error", "Invalid unsubscribe link."), {
      headers: { "Content-Type": "text/html" }, status: 404,
    });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (type === "marketing") {
    updates.marketing_emails = false;
  } else if (type === "deadlines") {
    updates.deadline_reminders = false;
  } else if (type === "lifecycle") {
    updates.lifecycle_emails = false;
  } else {
    updates.unsubscribed_all = true;
    updates.marketing_emails = false;
    updates.deadline_reminders = false;
    updates.lifecycle_emails = false;
  }

  await supabase
    .from("email_preferences")
    .update(updates)
    .eq("unsubscribe_token", token);

  const typeLabel = type === "marketing" ? "marketing emails"
    : type === "deadlines" ? "deadline reminders"
    : type === "lifecycle" ? "lifecycle emails"
    : "all emails";

  return new Response(
    renderPage(
      "Unsubscribed",
      `<p>You have been unsubscribed from <strong>${typeLabel}</strong>.</p>
       <p style="margin-top:12px;font-size:13px;color:#6B6B6B;">This may take up to 10 business days to take full effect.</p>
       <p style="margin-top:16px;"><a href="https://eydn.app/dashboard/settings" style="color:#2C3E2D;font-weight:600;">Manage email preferences</a></p>`
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

function renderPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Eydn</title></head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF6F1;color:#1A1A2E;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <img src="https://eydn.app/logo.svg" alt="eydn" style="height:28px;margin-bottom:24px;" />
    <h1 style="font-size:22px;margin:0 0 16px;">${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}
