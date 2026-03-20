"use client";

type Props = {
  categories: string[];
  phases: string[];
  selectedCategory: string;
  selectedPhase: string;
  selectedStatus: string;
  selectedPriority: string;
  onCategoryChange: (v: string) => void;
  onPhaseChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
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
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={selectedPhase}
        onChange={(e) => onPhaseChange(e.target.value)}
        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
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
        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
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
        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
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
        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
      >
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  );
}
