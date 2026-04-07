/**
 * Web Push notification system.
 *
 * Required env vars:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *
 * Generate keys with: npx web-push generate-vapid-keys
 */

type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:hello@eydn.app", VAPID_PUBLIC, VAPID_PRIVATE);

    await webpush.sendNotification(
      subscription as unknown as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }
    );
    return { success: true };
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 410) {
      return { success: false, error: "subscription_expired" };
    }
    console.error("[PUSH] Send failed:", err.message || error);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Send push to all active subscriptions for a wedding.
 * Cleans up expired subscriptions automatically.
 */
export async function pushToWedding(
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/lib/supabase/types").Database>,
  weddingId: string,
  payload: PushPayload
): Promise<number> {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return 0;

  const sb = supabase;
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select()
    .eq("wedding_id", weddingId);

  if (!subs || subs.length === 0) return 0;

  let sent = 0;
  for (const sub of subs) {
    const result = await sendPushNotification(sub.subscription as unknown as PushSubscription, payload);
    if (result.success) {
      sent++;
    } else if (result.error === "subscription_expired") {
      await sb.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
  return sent;
}
