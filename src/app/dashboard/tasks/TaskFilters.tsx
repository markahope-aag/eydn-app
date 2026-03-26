"use client";

import { useState } from "react";

type Props = {
  categories: string[];
  phases: string[];
  selectedCategory: string;
  selectedPhase: string;
  selectedStatus: string;
  selectedPriority: string;
  onCategoryChange: (_v: string) => void;
  onPhaseChange: (_v: string) => void;
  onStatusChange: (_v: string) => void;
  onPriorityChange: (_v: string) => void;
};

export function TaskFilters({
  categories,
  phases,
  selectedCategory,
  selectedPhase,
  selectedStatus,
  selectedPriority,
  onCategoryChange,
  onPhaseChange,
  onStatusChange,
  onPriorityChange,
}: Props) {
  const activeCount = [selectedCategory, selectedPhase, selectedStatus, selectedPriority].filter(Boolean).length;
  const [open, setOpen] = useState(activeCount > 0);

  function clearAll() {
    onCategoryChange("");
    onPhaseChange("");
    onStatusChange("");
    onPriorityChange("");
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[14px] transition ${
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
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          >
            <option value="">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="overdue">Overdue</option>
          </select>
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
