"use client";

import { useState } from "react";
import Link from "next/link";
import { usePremium } from "@/components/PremiumGate";

export default function TrialBanner() {
  const { loaded, tier, isTrialing, trialDaysLeft } = usePremium();
  const [dismissed, setDismissed] = useState(false);

  if (!loaded || dismissed) return null;

  if (isTrialing) {
    const urgent = trialDaysLeft <= 3;
    const label =
      trialDaysLeft === 0
        ? "Trial ends today"
        : trialDaysLeft === 1
          ? "1 day left in your free trial"
          : `${trialDaysLeft} days left in your free trial`;

    return (
      <div
        className={`rounded-xl px-6 py-4 mb-6 ${
          urgent
            ? "border-2 border-violet/40 bg-violet/5"
            : "border border-violet/20 bg-lavender/30"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">{label}</p>
            <p className="text-[13px] text-muted mt-1">
              Upgrade now to keep everything you&apos;ve built — one payment, yours forever.
            </p>
          </div>
          <Link
            href="/dashboard/pricing"
            className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition text-center flex-shrink-0"
          >
            Upgrade — $79
          </Link>
        </div>
      </div>
    );
  }

  // Free tier — trial ended, not upgraded. Couple still has their data and
  // free-tier features; they've lost chat (now capped), day-of binder, and
  // vendor email templates. Soft upgrade nudge, dismissible per session.
  if (tier === "free") {
    return (
      <div className="rounded-xl px-6 py-4 mb-6 border border-violet/20 bg-lavender/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">You&apos;re on the free plan</p>
            <p className="text-[13px] text-muted mt-1">
              Your guest list, budget, and task timeline are yours to keep.
              Unlock unlimited AI chat, the day-of binder, and vendor email templates with Pro.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dashboard/pricing"
              className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition text-center"
            >
              Upgrade — $79
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="text-muted hover:text-plum text-xl leading-none px-2"
            >
              &times;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
