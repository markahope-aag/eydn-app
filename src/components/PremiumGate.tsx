"use client";

import { useSyncExternalStore, useCallback } from "react";
import { toast } from "sonner";

type SubscriptionStatus = {
  hasAccess: boolean;
  isPaid: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
};

// Cached subscription status — fetched once, shared across all consumers
let cachedStatus: SubscriptionStatus | null = null;
let fetchPromise: Promise<void> | null = null;
let statusListeners: Array<() => void> = [];

function notifyListeners() {
  statusListeners.forEach((l) => l());
}

function subscribeStatus(cb: () => void) {
  statusListeners.push(cb);
  // Trigger fetch on first subscriber
  if (!fetchPromise) {
    fetchPromise = fetch("/api/subscription-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) cachedStatus = data;
        notifyListeners();
      })
      .catch(() => {});
  }
  return () => { statusListeners = statusListeners.filter((l) => l !== cb); };
}

function getStatus() { return cachedStatus; }
function getServerStatus() { return null; }

/**
 * Hook to check premium access. Returns { hasAccess, isTrialing, trialDaysLeft, guardAction }.
 * `guardAction` wraps a callback — if no access, shows upgrade toast instead of running it.
 */
export function usePremium() {
  const status = useSyncExternalStore(subscribeStatus, getStatus, getServerStatus);

  const guardAction = useCallback(
    (action: () => void) => {
      if (!status || status.hasAccess) {
        action();
        return;
      }
      toast.error("This feature requires a paid plan.", {
        action: {
          label: "See pricing",
          onClick: () => { window.location.href = "/dashboard/pricing"; },
        },
      });
    },
    [status]
  );

  return {
    hasAccess: status?.hasAccess ?? true, // default to true while loading
    isTrialing: status?.isTrialing ?? false,
    trialDaysLeft: status?.trialDaysLeft ?? 0,
    isPaid: status?.isPaid ?? false,
    loaded: status !== null,
    guardAction,
  };
}

/**
 * A button that gates a premium action. Shows upgrade toast if trial expired.
 */
export function PremiumButton({
  onClick,
  children,
  className,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { guardAction } = usePremium();

  return (
    <button
      type="button"
      onClick={() => guardAction(onClick)}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
