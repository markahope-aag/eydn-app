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

  return (
    <div className="rounded-xl px-5 py-4 mb-4 border border-violet/20 bg-lavender/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-plum">
            New here? Here&apos;s how your checklist works
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="text-violet font-semibold">
                  {i + 1}.
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={dismiss} className="btn-secondary btn-sm mt-3">
            Got it
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss quick start"
          className="text-muted hover:text-plum text-xl leading-none px-2"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
