"use client";

import { useSyncExternalStore, useCallback } from "react";
import Link from "next/link";
import type { MemoryPlanStatus } from "@/app/api/memory-plan/route";

// ---------- Cached fetch (shared across all consumers) ----------
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

export function useMemoryPlan() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------- Banner ----------

export default function ArchiveBanner() {
  const status = useMemoryPlan();

  if (!status) return null;

  const { phase, active } = status;

  // Active weddings don't need a banner
  if (phase === "active") return null;

  // Post-wedding: soft info banner
  if (phase === "post_wedding") {
    return (
      <div className="rounded-xl border border-violet/20 bg-lavender/30 px-6 py-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">
              Congratulations! Your wedding has passed.
            </p>
            <p className="text-[13px] text-muted mt-1">
              Your data is safe. After 12 months, your account will become
              read-only unless you subscribe to the Memory Plan.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/settings?tab=export"
              className="text-[13px] font-medium text-violet hover:underline"
            >
              Download My Data
            </Link>
            <Link
              href="/#pricing"
              className="rounded-full border border-violet/30 px-4 py-1.5 text-[13px] font-medium text-violet hover:bg-violet/5 transition"
            >
              Learn about Memory Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Archived without memory plan: prominent banner
  if (phase === "archived" && !active) {
    return (
      <div className="rounded-xl border-2 border-violet/40 bg-violet/5 px-6 py-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-plum">
              Your account is in read-only mode
            </p>
            <p className="text-[14px] text-muted mt-1">
              Subscribe to the Memory Plan ($29/year) to keep editing and keep
              your wedding website live.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/settings?tab=export"
              className="text-[13px] font-medium text-violet hover:underline"
            >
              Download My Data
            </Link>
            <SubscribeButton />
          </div>
        </div>
      </div>
    );
  }

  // Archived with memory plan: subtle badge
  if (phase === "archived" && active) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 mb-6 inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <p className="text-[13px] text-green-800 font-medium">
          Memory Plan active — your data and website are preserved
        </p>
      </div>
    );
  }

  // Sunset phase
  if (phase === "sunset") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 mb-6">
        <p className="text-[15px] font-semibold text-red-800">
          Your account data has been archived.
        </p>
        <p className="text-[13px] text-red-700 mt-1">
          Contact{" "}
          <a
            href="mailto:support@eydn.app"
            className="underline hover:no-underline"
          >
            support@eydn.app
          </a>{" "}
          if you need to recover your data.
        </p>
      </div>
    );
  }

  return null;
}

function SubscribeButton() {
  const handleSubscribe = useCallback(async () => {
    try {
      const res = await fetch("/api/memory-plan", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Silently fail — user can retry
    }
  }, []);

  return (
    <button
      onClick={handleSubscribe}
      className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition"
    >
      Subscribe — $29/year
    </button>
  );
}
