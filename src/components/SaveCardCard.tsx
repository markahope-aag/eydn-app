"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { usePremium } from "@/components/PremiumGate";

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

export default function SaveCardCard() {
  const { loaded, isTrialing, trialDaysLeft, isPaid } = usePremium();
  const [scheduled, setScheduled] = useState<Scheduled>(null);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!loaded || isPaid || !isTrialing) {
      setLoadingScheduled(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscribe/scheduled");
        if (!cancelled && res.ok) {
          setScheduled(await res.json());
        }
      } finally {
        if (!cancelled) setLoadingScheduled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, isTrialing, isPaid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem("eydn.saveCard.dismissed") === "1");
    const params = new URLSearchParams(window.location.search);
    if (params.get("card_saved") === "1") {
      toast.success("Card saved. You're set for when the trial ends.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!loaded || !isTrialing || isPaid || loadingScheduled) return null;

  async function saveCard(plan: "pro_monthly" | "lifetime") {
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/save-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error("Couldn't start the card save. Try again.");
      setBusy(false);
    }
  }

  async function cancelScheduled() {
    if (!scheduled) return;
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe/scheduled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error();
      setScheduled(null);
      toast.success("Auto-renew cancelled. Your trial still runs as scheduled.");
    } catch {
      toast.error("Couldn't cancel. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem("eydn.saveCard.dismissed", "1");
    setDismissed(true);
  }

  // State 1 — card already saved, scheduled to convert
  if (scheduled) {
    const dateLabel = formatDate(scheduled.scheduled_for);
    const planLabel =
      scheduled.plan === "lifetime" ? "$79 one-time" : "$14.99 / month";
    return (
      <div className="rounded-xl px-6 py-4 mb-6 border border-violet/20 bg-lavender/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">
              Card saved. Pro starts {dateLabel}.
            </p>
            <p className="text-[13px] text-muted mt-1">
              {planLabel}. You can cancel or change plans any time before then.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/dashboard/billing"
              className="rounded-full border border-violet/40 px-4 py-2 text-[13px] font-semibold text-plum hover:bg-white transition text-center"
            >
              Manage
            </Link>
            <button
              onClick={cancelScheduled}
              disabled={busy}
              className="rounded-full px-4 py-2 text-[13px] font-semibold text-muted hover:text-plum transition text-center disabled:opacity-50"
            >
              Cancel auto-renew
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prominent (day 13+) — overrides dismissal
  const prominent = trialDaysLeft <= 1;
  if (dismissed && !prominent) return null;

  // Suppress gentle version for first week
  if (!prominent && trialDaysLeft > 7) return null;

  return (
    <div
      className={`rounded-xl px-6 py-4 mb-6 ${
        prominent
          ? "border-2 border-violet/40 bg-violet/5"
          : "border border-violet/20 bg-lavender/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-plum">
            {prominent ? "Your trial ends tomorrow" : "Keep your access after day 14"}
          </p>
          <p className="text-[13px] text-muted mt-1">
            Save a card now. Nothing gets charged today — the first $14.99 only
            lands when your trial ends. Cancel any time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={() => saveCard("pro_monthly")}
            disabled={busy}
            className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50"
          >
            Save card — $14.99/mo
          </button>
          <Link
            href="/dashboard/pricing"
            className="rounded-full border border-violet/40 px-4 py-2 text-[13px] font-semibold text-plum hover:bg-white transition text-center"
          >
            See Lifetime
          </Link>
          {!prominent && (
            <button
              onClick={dismiss}
              className="px-3 py-2 text-[12px] text-muted hover:text-plum transition"
            >
              Not yet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
