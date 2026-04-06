"use client";

import { useState } from "react";
import Link from "next/link";
import { triggerConfetti } from "@/components/Confetti";

const STORAGE_KEY = "eydn_dayof_revealed";

export function DayOfReveal({ partnerNames, daysLeft }: { partnerNames: string; daysLeft: number }) {
  const [visible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(STORAGE_KEY)) return false;
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(() => triggerConfetti(), 400);
    return true;
  });
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#2C3E2D] text-center px-6">
      <div className="max-w-lg">
        <p className="text-[16px] tracking-widest uppercase text-[#C9A84C]/70">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} to go
        </p>
        <h1 className="mt-4 text-[40px] md:text-[52px] font-semibold text-[#FAF6F1] leading-tight">
          Your big day is almost here.
        </h1>
        <p className="mt-6 text-[18px] text-[#FAF6F1]/70 leading-relaxed max-w-md mx-auto">
          We put everything together so you don&rsquo;t have to think about a thing.
          Timeline, vendor contacts, packing list, ceremony script — it&rsquo;s all ready.
        </p>
        <p className="mt-3 text-[15px] text-[#C9A84C]/80 italic">
          {partnerNames}, this is going to be beautiful.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/day-of"
            className="inline-block rounded-full px-8 py-4 text-[15px] font-semibold text-[#2C3E2D] bg-[#FAF6F1] hover:bg-white transition"
          >
            View Your Day-of Planner
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="inline-block rounded-full px-8 py-4 text-[15px] font-semibold text-[#FAF6F1]/70 border border-[#FAF6F1]/20 hover:border-[#FAF6F1]/40 transition"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
