"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuickStartStep } from "@/lib/onboarding/quick-start";
import { QuickStartStepModal } from "./QuickStartStepModal";
import { usePremium } from "@/components/PremiumGate";

/**
 * Optional getting-started walk-through shown to new couples in place of the
 * full dashboard. Leads with the single next step and a short setup checklist.
 * Tapping a step opens a focused overlay so the couple completes it in place and
 * returns here — no full-page navigation. They can switch to the full dashboard
 * any time, and it auto-graduates once setup is complete.
 */
export function QuickStart({
  partnerName,
  steps,
  weddingId,
}: {
  partnerName: string;
  steps: QuickStartStep[];
  weddingId: string;
}) {
  const router = useRouter();
  const { isReadOnly, notifyReadOnly } = usePremium();
  const [leaving, setLeaving] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done) ?? null;
  const activeStep = steps.find((s) => s.key === activeKey) ?? null;

  async function switchToFull() {
    if (isReadOnly) { notifyReadOnly(); return; }
    setLeaving(true);
    try {
      const res = await fetch("/api/quickstart-status", { method: "PUT" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Couldn't switch right now. Try again.");
      setLeaving(false);
    }
  }

  return (
    <section aria-label="Quick start" className="max-w-2xl">
      <div className="flex items-baseline justify-between gap-3">
        <h1>Welcome, {partnerName}</h1>
        <span className="text-[13px] text-muted whitespace-nowrap">
          {doneCount} of {steps.length} done
        </span>
      </div>
      <p className="mt-1 text-[15px] text-muted">
        Let&apos;s set the foundation — one step at a time. You can switch to the
        full dashboard whenever you like.
      </p>

      {/* Next step — the single most useful thing to do right now */}
      {next && (
        <div className="mt-5 card p-6 border border-violet/30 bg-white shadow-sm">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-violet">
            Next step
          </p>
          <h2 className="mt-1 text-[18px] text-plum">{next.label}</h2>
          <p className="mt-1 text-[15px] text-muted">{next.description}</p>
          <button
            type="button"
            onClick={() => setActiveKey(next.key)}
            className="btn-primary mt-4 inline-flex items-center gap-1"
          >
            {next.cta}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {/* Setup checklist */}
      <ol className="mt-6 space-y-1.5">
        {steps.map((step) => {
          const isNext = step.key === next?.key;
          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => setActiveKey(step.key)}
                className={`w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition ${
                  isNext ? "bg-lavender/60" : "hover:bg-lavender/30"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[12px] ${
                    step.done
                      ? "bg-confirmed-bg text-confirmed-text"
                      : "border border-border text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`flex-1 text-[15px] ${
                    step.done ? "text-muted line-through" : "text-plum"
                  }`}
                >
                  {step.label}
                </span>
                {isNext && (
                  <span className="text-[12px] font-semibold text-violet">Start →</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={switchToFull}
          disabled={leaving || isReadOnly}
          className="text-[14px] font-semibold text-violet hover:text-soft-violet transition disabled:opacity-50"
        >
          {leaving ? "Switching…" : "Switch to full dashboard →"}
        </button>
        <p className="mt-1 text-[12px] text-muted">
          You can always come back to this from Help &amp; Support.
        </p>
      </div>

      {activeStep && (
        <QuickStartStepModal
          step={activeStep}
          weddingId={weddingId}
          onClose={() => setActiveKey(null)}
          onSaved={() => {
            setActiveKey(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
