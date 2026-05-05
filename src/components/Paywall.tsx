"use client";

import { useState, useEffect } from "react";
import type { SubscriptionStatus } from "@/lib/subscription";

export function Paywall({
  children,
  feature,
}: {
  children: React.ReactNode;
  feature: string;
}) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    fetch("/api/subscription-status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return <>{children}</>;

  if (status.hasAccess) {
    return (
      <>
        {status.isTrialing && (
          <div className="mb-4 bg-lavender rounded-[12px] px-4 py-2 flex items-center justify-between">
            <p className="text-[13px] text-violet">
              Free trial: {status.trialDaysLeft} {status.trialDaysLeft === 1 ? "day" : "days"} left
            </p>
            <a href="/dashboard/pricing" className="text-[13px] font-semibold text-violet hover:text-soft-violet">
              See plans
            </a>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-lavender flex items-center justify-center mx-auto">
        <span className="text-[26px]">🔒</span>
      </div>
      <h2 className="mt-4 text-plum">{feature} is part of the full plan</h2>
      <p className="mt-2 text-[15px] text-muted max-w-md mx-auto">
        Your free trial has ended. Pick the plan that fits — $79 once for Lifetime, or $14.99/mo, cancel any time.
      </p>
      <a href="/dashboard/pricing" className="btn-primary mt-6 inline-flex">
        See plans
      </a>
    </div>
  );
}
