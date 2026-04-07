"use client";

import Link from "next/link";
import { usePremium } from "@/components/PremiumGate";

export default function TrialBanner() {
  const { loaded, isTrialing, trialDaysLeft, isPaid } = usePremium();

  if (!loaded || !isTrialing || isPaid) return null;

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
