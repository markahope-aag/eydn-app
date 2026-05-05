"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Suggestion = { title: string; why: string; action: string };
type Optimization = { summary: string; suggestions: Suggestion[] };

type OptimizationRow = {
  id: string;
  trigger_reason: string;
  suggestion: Optimization;
  generated_at: string;
};

type Detection =
  | { triggered: false }
  | { triggered: true; reason: string; overCategories: Array<{ category: string; overPct: number }> };

type Response = {
  optimization: OptimizationRow | null;
  detection: Detection;
  canGenerate: boolean;
  tier: string;
};

/**
 * Surfaces an AI budget optimization when one or more categories have
 * gone over budget. Four states mirror CatchUpBanner: no trigger,
 * Pro + no active suggestion (generate CTA), Pro + active suggestion
 * (full card), free tier (paywall CTA).
 */
export default function BudgetOptimizerBanner() {
  const [state, setState] = useState<Response | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/budget-optimize")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Response | null) => {
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
      const res = await fetch("/api/budget-optimize", { method: "POST" });
      if (res.status === 403) {
        toast.error("Budget optimizer is a Pro feature.", {
          action: { label: "See pricing", onClick: () => (window.location.href = "/dashboard/pricing") },
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error || "Couldn't build a suggestion right now. Try again.");
        return;
      }
      const data = (await res.json()) as { triggered: boolean; optimization?: OptimizationRow };
      if (data.triggered && data.optimization) {
        setState((prev) => (prev ? { ...prev, optimization: data.optimization ?? null } : prev));
        toast.success("Your budget suggestion is ready.");
      } else {
        toast.success("Your budget is actually on track — no rebalancing needed.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDismiss() {
    if (!state?.optimization) return;
    setDismissing(true);
    try {
      const res = await fetch("/api/budget-optimize", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.optimization.id }),
      });
      if (res.ok) {
        setState((prev) => (prev ? { ...prev, optimization: null } : prev));
      }
    } finally {
      setDismissing(false);
    }
  }

  // Free tier → paywall
  if (!state.canGenerate) {
    return (
      <div className="mt-4 rounded-xl px-6 py-4 border border-violet/20 bg-lavender/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">{state.detection.reason}</p>
            <p className="text-[13px] text-muted mt-1">
              Upgrade to Pro and Eydn will suggest specific reallocations or cuts to get you back on track.
            </p>
          </div>
          <Link
            href="/dashboard/pricing"
            className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition text-center flex-shrink-0"
          >
            Upgrade — from $14.99/mo
          </Link>
        </div>
      </div>
    );
  }

  // Pro + no active suggestion → generate CTA
  if (!state.optimization) {
    return (
      <div className="mt-4 rounded-xl px-6 py-4 border border-violet/20 bg-lavender/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-plum">{state.detection.reason}</p>
            <p className="text-[13px] text-muted mt-1">
              Let Eydn suggest specific reallocations or cuts to get back on track.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-full bg-brand-gradient px-5 py-2 text-[13px] font-semibold text-white shadow hover:opacity-90 transition text-center flex-shrink-0 disabled:opacity-60"
          >
            {generating ? "Thinking…" : "Get a suggestion"}
          </button>
        </div>
      </div>
    );
  }

  // Pro + active suggestion → full card
  const opt = state.optimization.suggestion;
  return (
    <div className="mt-4 rounded-xl px-6 py-5 border-2 border-violet/30 bg-violet/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-violet">
            Budget suggestion
          </p>
          <p className="text-[15px] text-plum mt-2">{opt.summary}</p>
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
        {opt.suggestions.map((s, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet text-white text-[12px] font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-plum">{s.title}</p>
              <p className="text-[13px] text-muted mt-0.5">{s.why}</p>
              <p className="text-[12px] text-violet mt-1">{s.action}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
