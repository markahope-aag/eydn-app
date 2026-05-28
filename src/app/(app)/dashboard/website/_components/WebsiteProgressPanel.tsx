"use client";

import type { WebsiteProgressSummary, WebsiteTab } from "@/lib/website-milestones";

interface WebsiteProgressPanelProps {
  summary: WebsiteProgressSummary;
  onJumpToTab: (tab: WebsiteTab) => void;
}

function daysLabel(daysUntil: number | null): string | null {
  if (daysUntil === null) return null;
  if (daysUntil <= 0) return "The big day is here";
  if (daysUntil === 1) return "1 day to go";
  return `${daysUntil} days to go`;
}

/**
 * Timeline-aware guidance panel for the website builder. Shows the
 * couple which stage they're in, what to focus on, and which sections
 * still need attention.
 */
export function WebsiteProgressPanel({ summary, onJumpToTab }: WebsiteProgressPanelProps) {
  const { stageInfo, checklist, doneCount, totalCount, overdueCount, isComplete } = summary;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const label = daysLabel(summary.daysUntil);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-plum">{stageInfo.title}</h2>
          {label && <p className="text-[12px] text-muted mt-0.5">{label}</p>}
        </div>
        <span className="text-[13px] font-semibold text-violet whitespace-nowrap">
          {doneCount}/{totalCount} sections
        </span>
      </div>

      <div
        className="mt-3 h-2 rounded-full bg-lavender overflow-hidden"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
      >
        <div
          className="h-full rounded-full bg-violet transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-[14px] text-muted leading-relaxed">{stageInfo.focus}</p>

      {isComplete && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Every section is filled in — your site is in great shape.
        </p>
      )}

      <div className="mt-4">
        {!isComplete && (
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
            {overdueCount > 0 ? `Needs attention — ${overdueCount} overdue` : "Progress"}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-1">
          {checklist.map((item) => {
            const ringClass = item.done
              ? "border-emerald-500 bg-emerald-500"
              : item.overdue
                ? "border-amber-500"
                : "border-violet/40";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onJumpToTab(item.tab)}
                className="group flex items-center gap-2 text-left rounded-[8px] px-2 py-1.5 hover:bg-lavender/60 transition"
              >
                <span
                  className={`flex-shrink-0 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center ${ringClass}`}
                  aria-hidden="true"
                >
                  {item.done && (
                    <svg className="w-[9px] h-[9px] text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.5 6.5l2.5 2.5L9.5 3.5" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-[14px] transition ${
                    item.done
                      ? "text-muted line-through decoration-muted/50"
                      : "text-plum group-hover:text-violet"
                  }`}
                >
                  {item.label}
                </span>
                {!item.done && item.overdue && (
                  <span className="ml-auto text-[11px] font-semibold text-amber-600">overdue</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
