"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "eydn_tasks_quickstart_dismissed";

/**
 * One-time quick-start guidance for the Tasks page. New couples land on a long
 * seeded checklist; this explains how to read and work it, then gets out of the
 * way. Dismissal is remembered per browser via localStorage.
 *
 * Starts hidden and reveals after mount only when not previously dismissed —
 * this avoids both a hydration mismatch and a flash for returning users.
 */
export function TasksQuickStart() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Deferred so the reveal happens after mount (not synchronously in the
    // effect body) — avoids cascading renders and any hydration mismatch.
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        if (localStorage.getItem(STORAGE_KEY) !== "1") setHidden(false);
      } catch {
        setHidden(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Non-fatal: dismissal just won't persist if storage is unavailable.
    }
    setHidden(true);
  }

  if (hidden) return null;

  const tips = [
    <>
      Tasks are grouped by timeline — begin with{" "}
      <span className="font-medium text-plum">Start Here</span> and work down.
      There&apos;s no need to do everything at once.
    </>,
    <>Tap any task to open it, add notes, or set a due date.</>,
    <>
      Click the status pill to mark a task in progress or done — and drag tasks
      to reorder them.
    </>,
    <>
      Due dates come from your wedding date above. Update it any time and the
      timeline adjusts.
    </>,
  ];

  // Collapsed by default to keep the top of the page light — the summary row is
  // a single line; couples expand it only if they want the walkthrough.
  return (
    <details className="group rounded-xl mb-4 border border-violet/20 bg-lavender/30 [&_svg]:open:rotate-90">
      <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer list-none text-[14px] font-semibold text-plum">
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          className="text-violet transition-transform flex-shrink-0"
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1">New here? How your checklist works</span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); dismiss(); }}
          aria-label="Dismiss quick start"
          className="text-muted hover:text-plum text-xl leading-none px-1"
        >
          &times;
        </button>
      </summary>
      <div className="px-4 pb-4 pt-0">
        <ul className="space-y-1.5 text-[13px] text-muted pl-6">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="text-violet font-semibold">
                {i + 1}.
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={dismiss} className="btn-secondary btn-sm mt-3 ml-6">
          Got it
        </button>
      </div>
    </details>
  );
}
