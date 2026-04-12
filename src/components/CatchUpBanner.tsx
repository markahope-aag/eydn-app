"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Priority = { title: string; why: string; when: string };
type Plan = { summary: string; priorities: Priority[] };

type PlanRow = {
  id: string;
  trigger_reason: string;
  plan: Plan;
  generated_at: string;
};

type Detection = { triggered: false } | { triggered: true; reason: string; overdueCount: number };

type CatchUpResponse = {
  plan: PlanRow | null;
  detection: Detection;
  canGenerate: boolean;
  tier: string;
};

/**
 * Surfaces an AI catch-up plan when a couple has fallen behind.
 * Three states:
 *   1. No trigger → render nothing.
 *   2. Trigger + Pro + no active plan → "generate" CTA.
 *   3. Trigger + Pro + active plan → full plan card with dismiss.
 *   4. Trigger + free → paywall CTA.
 */
export default function CatchUpBanner() {
  const [state, setState] = useState<CatchUpResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catch-up")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CatchUpResponse | null) => {
        if (!cancelled && data) setState(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || !state.detection.triggered) return null;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/catch-up", { method: "POST" });
      if (res.status === 403) {
        toast.error("Catch-up plans are a Pro feature.", {
          action: { label: "See pricing", onClick: () => (window.location.href = "/dashboard/pricing") },
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error || "Couldn't build a plan right now. Try again.");
        return;
      }
      const data = (await res.json()) as { triggered: boolean; plan?: PlanRow };
      if (data.triggered && data.plan) {
        setState((prev) => (prev ? { ...prev, plan: data.plan ?? null } : prev));
        toast.success("Your catch-up plan is ready.");
      } else {
        toast.success("You're actually in good shape — no catch-up needed.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDismiss() {
    if (!state?.plan) return;
    setDismissing(true);
    try {
      const res = await fetch("/api/catch-up", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.plan.id }),
      });
      if (res.ok) {
        setState((prev) => (prev ? { ...prev, plan: null } : prev));
      }
    } finally {
      setDismissing(false);
    }
  }

  // State 4: free tier → paywall
  if (!state.canGenerate) {
    return (
      <div className="rounded-xl px-6 py-4 mb-6 border border-violet/20 bg-lavender/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">
              You have {state.detection.overdueCount} overdue tasks
            </p>
            <p className="text-[13px] text-muted mt-1">
              Upgrade to Pro and Eydn will build you a personalized 2-week catch-up plan that
              prioritizes what actually matters right now.
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

  // State 2: Pro + no active plan → generate CTA
  if (!state.plan) {
    return (
      <div className="rounded-xl px-6 py-4 mb-6 border border-violet/20 bg-lavender/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">
              You have {state.detection.overdueCount} overdue tasks
            </p>
            <p className="text-[13px] text-muted mt-1">
              Let Eydn build you a personalized 2-week catch-up plan — just the few things that matter most.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition text-center flex-shrink-0 disabled:opacity-60"
          >
            {generating ? "Building your plan…" : "Build my catch-up plan"}
          </button>
        </div>
      </div>
    );
  }

  // State 3: Pro + active plan → full card
  const plan = state.plan.plan;
  return (
    <div className="rounded-xl px-6 py-5 mb-6 border-2 border-violet/30 bg-violet/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-violet">
            Your catch-up plan
          </p>
          <p className="text-[15px] text-plum mt-2">{plan.summary}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss"
          className="text-muted hover:text-plum text-xl leading-none px-2 disabled:opacity-40"
        >
          &times;
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {plan.priorities.map((p, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet text-white text-[12px] font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-plum">{p.title}</p>
              <p className="text-[13px] text-muted mt-0.5">{p.why}</p>
              <p className="text-[12px] text-violet mt-1">{p.when}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
