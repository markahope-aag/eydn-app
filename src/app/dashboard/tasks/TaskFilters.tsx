"use client";

type Props = {
  categories: string[];
  phases: string[];
  selectedCategory: string;
  selectedPhase: string;
  selectedStatus: string;
  onCategoryChange: (v: string) => void;
  onPhaseChange: (v: string) => void;
  onStatusChange: (v: string) => void;
};

export function TaskFilters({
  categories,
  phases,
  selectedCategory,
  selectedPhase,
  selectedStatus,
  onCategoryChange,
  onPhaseChange,
  onStatusChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={selectedPhase}
        onChange={(e) => onPhaseChange(e.target.value)}
        className="rounded-lg border px-3 py-1.5 text-sm"
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
        className="rounded-lg border px-3 py-1.5 text-sm"
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
        className="rounded-lg border px-3 py-1.5 text-sm"
      >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="overdue">Overdue</option>
      </select>
    </div>
  );
}
