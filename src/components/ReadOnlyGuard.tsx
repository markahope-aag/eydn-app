"use client";

import { useSyncExternalStore, useCallback } from "react";
import { toast } from "sonner";
import type { MemoryPlanStatus } from "@/app/api/memory-plan/route";

// ---------- Cached fetch (shared with ArchiveBanner via same endpoint) ----------
let cached: MemoryPlanStatus | null = null;
let fetchPromise: Promise<void> | null = null;
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  if (!fetchPromise) {
    fetchPromise = fetch("/api/memory-plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) cached = data;
        notify();
      })
      .catch(() => {});
  }
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot() {
  return cached;
}
function getServerSnapshot() {
  return null;
}

/**
 * Hook to check read-only mode. Returns { isReadOnly, guardAction }.
 * `guardAction` wraps a callback — if read-only, shows a toast instead of running it.
 */
export function useReadOnly() {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isReadOnly =
    status !== null &&
    status.phase === "archived" &&
    !status.active;

  const guardAction = useCallback(
    (action: () => void) => {
      if (!isReadOnly) {
        action();
        return;
      }
      toast.error("Your account is in read-only mode.", {
        description: "Subscribe to the Memory Plan to continue editing.",
        action: {
          label: "Subscribe — $29/yr",
          onClick: async () => {
            try {
              const res = await fetch("/api/memory-plan", { method: "POST" });
              const data = await res.json();
              if (data.url) {
                window.location.href = data.url;
              }
            } catch {
              // Silently fail
            }
          },
        },
      });
    },
    [isReadOnly],
  );

  return {
    isReadOnly,
    loaded: status !== null,
    phase: status?.phase ?? "active",
    memoryPlanActive: status?.active ?? false,
    guardAction,
  };
}
