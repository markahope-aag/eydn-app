"use client";

import { usePremium } from "@/components/PremiumGate";

/**
 * Persistent view-only indicator for the "parent" collaborator role. Parents
 * can browse the whole dashboard but every edit is blocked server-side, so this
 * sets the expectation up front rather than letting them hit silent 403s.
 * Not dismissible — it reflects a standing access level, not a nudge.
 */
export default function ReadOnlyBanner() {
  const { loaded, isReadOnly } = usePremium();

  if (!loaded || !isReadOnly) return null;

  return (
    <div
      role="status"
      className="rounded-xl px-6 py-4 mb-6 border border-violet/20 bg-lavender/30"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center text-violet text-[15px] font-semibold"
        >
          ◔
        </span>
        <div>
          <p className="text-[15px] font-semibold text-plum">You have view-only access</p>
          <p className="text-[13px] text-muted mt-0.5">
            Browse anything you like — tasks, guests, budget, and plans. Only the
            couple can make changes.
          </p>
        </div>
      </div>
    </div>
  );
}
