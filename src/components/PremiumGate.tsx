"use client";

import { useSyncExternalStore, useCallback } from "react";
import { toast } from "sonner";
import type { SubscriptionStatus, FeatureKey, Tier, Features } from "@/lib/subscription";

export type { FeatureKey, Tier, Features };

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
 * Hook to check premium access. Returns tier + per-feature booleans plus
 * `guardAction` / `guardFeature` helpers that wrap a callback — if the
 * gate is closed, they show an upgrade toast instead of running the action.
 */
export function usePremium() {
  const status = useSyncExternalStore(subscribeStatus, getStatus, getServerStatus);

  const showUpgradeToast = useCallback(() => {
    toast.error("This feature requires a paid plan.", {
      action: {
        label: "See pricing",
        onClick: () => { window.location.href = "/dashboard/pricing"; },
      },
    });
  }, []);

  // Legacy API: gate on the overall hasAccess boolean.
  const guardAction = useCallback(
    (action: () => void) => {
      if (!status || status.hasAccess) {
        action();
        return;
      }
      showUpgradeToast();
    },
    [status, showUpgradeToast]
  );

  // Preferred API: gate on a specific feature.
  const guardFeature = useCallback(
    (feature: FeatureKey, action: () => void) => {
      if (!status || status.features[feature]) {
        action();
        return;
      }
      showUpgradeToast();
    },
    [status, showUpgradeToast]
  );

  const can = useCallback(
    (feature: FeatureKey): boolean => {
      // Default to true while loading so the UI doesn't flash gated.
      if (!status) return true;
      return status.features[feature];
    },
    [status]
  );

  return {
    tier: status?.tier ?? ("trialing" as Tier),
    features: status?.features ?? null,
    hasAccess: status?.hasAccess ?? true,
    isTrialing: status?.isTrialing ?? false,
    trialDaysLeft: status?.trialDaysLeft ?? 0,
    isPaid: status?.isPaid ?? false,
    isBeta: status?.isBeta ?? false,
    loaded: status !== null,
    can,
    guardAction,
    guardFeature,
  };
}

/**
 * A button that gates an action behind a premium check. If `feature` is
 * provided, gates on that specific feature; otherwise falls back to the
 * legacy overall hasAccess boolean.
 */
export function PremiumButton({
  onClick,
  children,
  className,
  disabled,
  feature,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  feature?: FeatureKey;
}) {
  const { guardAction, guardFeature } = usePremium();

  return (
    <button
      type="button"
      onClick={() => (feature ? guardFeature(feature, onClick) : guardAction(onClick))}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
