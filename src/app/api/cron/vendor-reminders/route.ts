import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logCronExecution } from "@/lib/cron-logger";
import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    // Fetch vendors that owe money (amount > 0 and amount_paid < amount)
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, wedding_id, name, category, amount, amount_paid, status")
      .is("deleted_at", null)
      .gt("amount", 0);

    if (!vendors || vendors.length === 0) {
      await logCronExecution({
        jobName: "vendor-reminders",
        status: "success",
        durationMs: Date.now() - startTime,
        details: { notificationsCreated: 0 },
      });
      return NextResponse.json({ notifications_created: 0 });
    }

    // Filter to vendors with outstanding balance or upcoming booked/deposit_paid vendors
    const relevantVendors = vendors.filter((v) => {
      const hasBal = (v.amount_paid ?? 0) < (v.amount ?? 0);
      const isUpcoming = v.status === "booked" || v.status === "deposit_paid";
      return hasBal || isUpcoming;
    });

    if (relevantVendors.length === 0) {
      await logCronExecution({
        jobName: "vendor-reminders",
        status: "success",
        durationMs: Date.now() - startTime,
        details: { notificationsCreated: 0 },
      });
      return NextResponse.json({ notifications_created: 0 });
    }

    // Check for existing vendor_payment notifications created in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const vendorIds = relevantVendors.map((v) => v.id);
    const { data: existing } = await supabase
      .from("notifications")
      .select("vendor_id")
      .in("vendor_id", vendorIds)
      .eq("type", "vendor_payment")
      .gte("created_at", oneWeekAgo.toISOString());

    const recentlyNotifiedIds = new Set(
      (existing || []).map((n: { vendor_id: string | null }) => n.vendor_id)
    );

    const newVendors = relevantVendors.filter((v) => !recentlyNotifiedIds.has(v.id));

    const newNotifications = newVendors.map((v) => ({
      wedding_id: v.wedding_id,
      type: "vendor_payment",
      title: `Payment reminder: ${v.name}`,
      body: `${v.name} — $${v.amount_paid ?? 0} of $${v.amount ?? 0} paid. Check if a payment is coming up.`,
      vendor_id: v.id,
    }));

    if (newNotifications.length > 0) {
      await supabase.from("notifications").insert(newNotifications);
    }

    await logCronExecution({
      jobName: "vendor-reminders",
      status: "success",
      durationMs: Date.now() - startTime,
      details: { notificationsCreated: newNotifications.length, vendorsChecked: relevantVendors.length },
    });

    return NextResponse.json({ notifications_created: newNotifications.length });
  } catch (error) {
    await logCronExecution({
      jobName: "vendor-reminders",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
