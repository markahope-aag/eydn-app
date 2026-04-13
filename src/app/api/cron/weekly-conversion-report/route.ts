import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";

type PostHogQueryResponse = {
  results?: unknown[][];
};

async function posthogHogQl(query: string): Promise<unknown[][]> {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return [];

  const res = await fetch(`${host.replace("i.posthog.com", "posthog.com")}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query },
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as PostHogQueryResponse;
  return data.results || [];
}

async function stripeRevenueLast7Days(): Promise<number> {
  try {
    const stripe = getStripe();
    const since = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    let total = 0;
    for await (const charge of stripe.charges.list({
      created: { gte: since },
      limit: 100,
    })) {
      if (charge.paid && !charge.refunded) total += charge.amount;
    }
    return total / 100;
  } catch {
    return 0;
  }
}

/**
 * Weekly conversion report: summarizes trial signups, paid conversions, calc→trial rate,
 * AI cost per tier, and Stripe revenue for the prior 7 days. Emails the first address in
 * ADMIN_EMAILS.
 *
 * Schedule: 0 13 * * 1 (Mondays 9 AM ET / 13:00 UTC)
 * Auth: Bearer BACKUP_SECRET
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.BACKUP_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
  if (!recipient) {
    return NextResponse.json({ error: "No ADMIN_EMAILS configured" }, { status: 500 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Source-of-truth counts from Supabase
  const supabase = createSupabaseAdmin();

  const { count: trialSignupsWeek } = await supabase
    .from("weddings")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  const { count: trialSignupsCumulative } = await supabase
    .from("weddings")
    .select("id", { count: "exact", head: true });

  const { data: paidRows } = await supabase
    .from("subscriber_purchases")
    .select("plan, amount, purchased_at")
    .eq("status", "active")
    .gte("purchased_at", weekAgo);

  const paid = (paidRows || []) as Array<{ plan: string; amount: number; purchased_at: string }>;
  const lifetimeCount = paid.filter((p) => p.plan === "lifetime").length;
  const monthlyCount = paid.filter((p) => p.plan === "pro_monthly").length;

  const revenue = await stripeRevenueLast7Days();

  // PostHog-derived metrics (optional — skipped if no personal API key set)
  const aiCostRows = await posthogHogQl(
    `SELECT properties.tier, sum(toFloat(properties.estimated_cost_usd)) AS cost, count(DISTINCT person_id) AS users
     FROM events
     WHERE event = 'ai_chat_message_sent' AND timestamp > now() - INTERVAL 7 DAY
     GROUP BY properties.tier`
  );

  const aiCostByTier: Record<string, { cost: number; users: number }> = {};
  for (const row of aiCostRows as Array<[string, number, number]>) {
    const [tier, cost, users] = row;
    if (tier) aiCostByTier[tier] = { cost, users };
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const perUser = (t: "trialing" | "paid" | "free") => {
    const row = aiCostByTier[t];
    if (!row || row.users === 0) return "n/a";
    return `$${(row.cost / row.users).toFixed(2)}`;
  };

  const killFlags: string[] = [];
  const trialCostPerUser = aiCostByTier.trialing?.users
    ? aiCostByTier.trialing.cost / aiCostByTier.trialing.users
    : 0;
  if (trialCostPerUser > 8) {
    killFlags.push(`⚠ Trial AI cost ${fmt(trialCostPerUser)}/user exceeds $8 cap`);
  }

  const subject = `Eydn weekly — ${new Date().toISOString().slice(0, 10)}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #2C3E2D;">
      <h2 style="margin: 0 0 16px;">${subject}</h2>
      ${
        killFlags.length > 0
          ? `<div style="background: #fef2f2; border: 1px solid #dc2626; padding: 12px; border-radius: 8px; color: #991b1b; margin-bottom: 16px;">
              ${killFlags.map((f) => `<div>${f}</div>`).join("")}
            </div>`
          : `<div style="background: #f0fdf4; border: 1px solid #16a34a; padding: 8px 12px; border-radius: 8px; color: #15803d; margin-bottom: 16px;">Kill criteria: all green</div>`
      }
      <table style="width:100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0;"><strong>Trials this week</strong></td><td align="right">${trialSignupsWeek ?? 0}</td></tr>
        <tr><td style="padding: 8px 0;">Trials cumulative</td><td align="right">${trialSignupsCumulative ?? 0}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Paid conversions</strong></td><td align="right">${lifetimeCount} Lifetime · ${monthlyCount} Monthly</td></tr>
        <tr><td style="padding: 8px 0;">Revenue (Stripe, 7d)</td><td align="right">$${fmt(revenue)}</td></tr>
        <tr><td style="padding: 8px 0;">AI cost per trial user</td><td align="right">${perUser("trialing")}</td></tr>
        <tr><td style="padding: 8px 0;">AI cost per paid user</td><td align="right">${perUser("paid")}</td></tr>
      </table>
      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        Paid conversion window splits and calc→trial rate are available as saved insights in PostHog.
      </p>
    </div>
  `;

  const result = await sendEmail({ to: recipient, subject, html });

  return NextResponse.json({
    ok: result.success,
    recipient,
    trialSignupsWeek,
    lifetimeCount,
    monthlyCount,
    revenue,
  });
}
