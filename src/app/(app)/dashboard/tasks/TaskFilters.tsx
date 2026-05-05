"use client";

import { useState } from "react";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "overdue", label: "Overdue" },
];

type Props = {
  categories: string[];
  phases: string[];
  selectedCategory: string;
  selectedPhase: string;
  // Multi-select: empty array = all statuses. Couples often want "show me
  // not-started AND in-progress" together, so this is a toggle list rather
  // than a dropdown.
  selectedStatuses: string[];
  selectedPriority: string;
  onCategoryChange: (_v: string) => void;
  onPhaseChange: (_v: string) => void;
  onStatusesChange: (_v: string[]) => void;
  onPriorityChange: (_v: string) => void;
};

export function TaskFilters({
  categories,
  phases,
  selectedCategory,
  selectedPhase,
  selectedStatuses,
  selectedPriority,
  onCategoryChange,
  onPhaseChange,
  onStatusesChange,
  onPriorityChange,
}: Props) {
  const activeCount =
    [selectedCategory, selectedPhase, selectedPriority].filter(Boolean).length +
    (selectedStatuses.length > 0 ? 1 : 0);
  const [open, setOpen] = useState(activeCount > 0);

  function clearAll() {
    onCategoryChange("");
    onPhaseChange("");
    onStatusesChange([]);
    onPriorityChange("");
  }

  function toggleStatus(value: string) {
    if (selectedStatuses.includes(value)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== value));
    } else {
      onStatusesChange([...selectedStatuses, value]);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[15px] transition ${
            activeCount > 0
              ? "bg-violet/10 text-violet font-semibold"
              : "bg-whisper text-muted hover:bg-lavender hover:text-plum"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1.5 3h11M3.5 7h7M5.5 11h3" />
          </svg>
          Filter
          {activeCount > 0 && (
            <span className="bg-violet text-white text-[11px] w-4 h-4 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] text-muted hover:text-plum transition"
          >
            Clear all
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-3">
          <select
            value={selectedPhase}
            onChange={(e) => onPhaseChange(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          >
            <option value="">All Phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((opt) => {
              const active = selectedStatuses.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatus(opt.value)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition border ${
                    active
                      ? "bg-violet/10 text-violet border-violet/30 font-semibold"
                      : "bg-white text-muted border-border hover:text-plum hover:border-plum/40"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      )}
    </div>
  );
}
