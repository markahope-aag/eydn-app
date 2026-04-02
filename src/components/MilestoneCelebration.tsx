"use client";

import { useState } from "react";
import { Confetti, triggerConfetti } from "@/components/Confetti";

const MILESTONES = [25, 50, 75, 100] as const;
const STORAGE_KEY = "eydn_last_milestone";

function getMilestoneMessage(pct: number, name: string): string {
  if (pct >= 100) return `Every single task is done, ${name}. You did it. This wedding is going to be absolutely perfect 💍`;
  if (pct >= 75) return `75% done, ${name}! The finish line is right there. You should be so proud of how far you've come ✨`;
  if (pct >= 50) return `You're halfway there, ${name}! The biggest decisions are behind you — everything from here gets more fun 💛`;
  return `25% done, ${name}! You've got real momentum now. The hardest part was starting — and you nailed it 🌿`;
}

export function MilestoneCelebration({ taskPct, name }: { taskPct: number; name: string }) {
  // useState initializer runs once — check localStorage and fire confetti if milestone reached
  const [milestone] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const lastCelebrated = Number(localStorage.getItem(STORAGE_KEY) || "0");
    const reached = MILESTONES.filter((m) => taskPct >= m && m > lastCelebrated);
    if (reached.length > 0) {
      const highest = reached[reached.length - 1];
      localStorage.setItem(STORAGE_KEY, String(highest));
      setTimeout(() => triggerConfetti(), 300);
      return highest;
    }
    return null;
  });
  const [dismissed, setDismissed] = useState(false);

  const active = dismissed ? null : milestone;

  if (!active) return <Confetti />;

  return (
    <>
      <Confetti />
      <div className="mb-6 rounded-[16px] overflow-hidden border-2 border-violet/20 bg-gradient-to-r from-lavender to-white">
        <div className="flex gap-3 items-start px-5 py-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center">
            <span className="text-[18px]">🎉</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-violet uppercase tracking-wide">Milestone Reached — {active}%</p>
            <p className="mt-1 text-[15px] text-plum leading-relaxed">{getMilestoneMessage(active, name)}</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-muted hover:text-plum transition mt-1"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
