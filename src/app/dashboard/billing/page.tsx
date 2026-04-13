"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Scheduled = {
  id: string;
  plan: "pro_monthly" | "lifetime";
  scheduled_for: string;
  status: string;
} | null;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function BillingPage() {
  const [scheduled, setScheduled] = useState<Scheduled>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe/scheduled");
      if (res.ok) setScheduled(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("card_saved") === "1") {
      toast.success("Card saved. You're set for when the trial ends.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function switchPlan(plan: "pro_monthly" | "lifetime") {
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/scheduled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch_plan", plan }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Switched to ${plan === "lifetime" ? "Lifetime" : "Monthly"}.`);
      await load();
    } catch {
      toast.error("Couldn't switch plans. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelScheduled() {
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/scheduled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Auto-renew cancelled.");
      setScheduled(null);
    } catch {
      toast.error("Couldn't cancel. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNewCard() {
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/save-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: scheduled?.plan || "pro_monthly" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error("Couldn't start the card update. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-[32px] text-plum mb-2">Billing</h1>
      <p className="text-[15px] text-muted mb-8">
        Manage your plan and card on file.
      </p>

      {loading ? (
        <div className="card-summary p-6">Loading…</div>
      ) : scheduled ? (
        <div className="card-summary p-6 space-y-4">
          <div>
            <div className="text-[13px] font-semibold text-violet uppercase tracking-wide mb-1">
              Scheduled to start
            </div>
            <div className="text-[24px] font-semibold text-plum">
              {formatDate(scheduled.scheduled_for)}
            </div>
            <div className="text-[15px] text-muted mt-1">
              {scheduled.plan === "lifetime"
                ? "$79 one-time payment (Lifetime)"
                : "$14.99 / month (Pro Monthly)"}
            </div>
          </div>

          <div className="border-t border-border pt-4 flex flex-wrap gap-3">
            {scheduled.plan === "pro_monthly" ? (
              <button
                onClick={() => switchPlan("lifetime")}
                disabled={busy}
                className="btn-secondary btn-sm disabled:opacity-50"
              >
                Switch to Lifetime
              </button>
            ) : (
              <button
                onClick={() => switchPlan("pro_monthly")}
                disabled={busy}
                className="btn-secondary btn-sm disabled:opacity-50"
              >
                Switch to Monthly
              </button>
            )}
            <button
              onClick={saveNewCard}
              disabled={busy}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              Update card
            </button>
            <button
              onClick={cancelScheduled}
              disabled={busy}
              className="text-[13px] text-muted hover:text-plum px-3 py-2"
            >
              Cancel auto-renew
            </button>
          </div>
        </div>
      ) : (
        <div className="card-summary p-6">
          <p className="text-[15px] text-plum mb-4">No card on file.</p>
          <p className="text-[13px] text-muted mb-6">
            When your trial ends, access drops unless you pick a plan first. Save
            a card now and we&apos;ll keep Pro running — $14.99/mo, cancel any time.
          </p>
          <div className="flex gap-3">
            <button
              onClick={saveNewCard}
              disabled={busy}
              className="btn-primary btn-sm disabled:opacity-50"
            >
              Save card — $14.99/mo
            </button>
            <Link href="/dashboard/pricing" className="btn-secondary btn-sm">
              See all plans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
