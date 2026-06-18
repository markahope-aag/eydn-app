"use client";

import { useSyncExternalStore, useCallback } from "react";
import { toast } from "sonner";
import type { SubscriptionStatus, FeatureKey, Tier, Features } from "@/lib/subscription";
import type { ToolCallMeter } from "@/lib/tool-call-counter";

export type { FeatureKey, Tier, Features };

export type CollaboratorRole = "owner" | "partner" | "coordinator" | "parent";

// Shape returned by /api/subscription-status — the base status plus the
// monthly tool-call meter (non-free tiers report limit/remaining as null) and
// the caller's collaborator role (null until a wedding is resolved).
type SubscriptionStatusResponse = SubscriptionStatus & {
  toolCalls: ToolCallMeter;
  role: CollaboratorRole | null;
};

// Cached subscription status — fetched once, shared across all consumers
let cachedStatus: SubscriptionStatusResponse | null = null;
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

  // Read-only enforcement for the "parent" collaborator role. `notifyReadOnly`
  // is the single source of the message so every gated control reads the same.
  const notifyReadOnly = useCallback(() => {
    toast.error("You have view-only access — only the couple can make changes.");
  }, []);

  // Wrap an edit action: if the user is view-only, show the message and skip;
  // otherwise run it. For onClick handlers. (Use `isReadOnly` + `notifyReadOnly`
  // for early-returns in handlers that take events/args.)
  const guardEdit = useCallback(
    (action: () => void) => {
      if (status?.role === "parent") {
        notifyReadOnly();
        return;
      }
      action();
    },
    [status, notifyReadOnly]
  );

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
    toolCalls: status?.toolCalls ?? null,
    role: status?.role ?? null,
    // Parent collaborators have view-only access — used to hide edit controls.
    isReadOnly: status?.role === "parent",
    hasAccess: status?.hasAccess ?? true,
    isTrialing: status?.isTrialing ?? false,
    trialDaysLeft: status?.trialDaysLeft ?? 0,
    isPaid: status?.isPaid ?? false,
    loaded: status !== null,
    can,
    guardAction,
    guardFeature,
    guardEdit,
    notifyReadOnly,
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
