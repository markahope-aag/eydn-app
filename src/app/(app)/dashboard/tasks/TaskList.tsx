"use client";

import { useState } from "react";
import { formatDueDate } from "@/lib/date-utils";
import { TASK_GUIDE_MAP } from "@/lib/tasks/task-guide-map";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "./types";

type Props = {
  tasks: Task[];
  onToggle: (_id: string) => void;
  onDelete: (_id: string) => void;
  onSelect: (_task: Task) => void;
  onReorder?: (_phaseTaskIds: string[]) => void;
};

const PHASE_ORDER = [
  "12 Months Before",
  "9-12 Months Before",
  "6-9 Months Before",
  "4-6 Months Before",
  "3-4 Months Before",
  "1-2 Months Before",
  "1 Week Before",
  "After the Wedding",
];

const PHASE_LABELS: Record<string, { label: string; hint: string }> = {
  "12 Months Before": { label: "Start Here", hint: "Lock in your big-ticket vendors early" },
  "9-12 Months Before": { label: "Building Momentum", hint: "Book your creative team and set the tone" },
  "6-9 Months Before": { label: "Details Taking Shape", hint: "Invitations, attire, and decor decisions" },
  "4-6 Months Before": { label: "Getting Real", hint: "Finalize menus, music, and guest details" },
  "3-4 Months Before": { label: "Fine-Tuning", hint: "Fittings, beauty trials, and logistics" },
  "1-2 Months Before": { label: "Almost There", hint: "Confirm everything and tie up loose ends" },
  "1 Week Before": { label: "Final Countdown", hint: "Last checks before your big day" },
  "After the Wedding": { label: "After the I Do's", hint: "Thank-yous, name changes, and memories" },
  "Custom Tasks": { label: "Custom Tasks", hint: "Tasks you added yourself" },
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_CLASSES: Record<string, string> = {
  not_started: "bg-whisper text-muted",
  in_progress: "bg-lavender text-violet",
  done: "bg-lavender text-plum",
};

// Priority drives a colored left accent bar so importance is scannable at a
// glance. Low priority gets a transparent bar to keep rows aligned.
const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-error",
  medium: "border-l-[#D4A017]",
  low: "border-l-transparent",
};

// A small wayfinding icon per task category for fast visual scanning.
const CATEGORY_ICON: Record<string, string> = {
  Budget: "💰",
  Planning: "📋",
  Guests: "👥",
  "Wedding Party": "🥂",
  Venue: "🏛️",
  Photography: "📷",
  Catering: "🍽️",
  Music: "🎵",
  Officiant: "📜",
  Honeymoon: "✈️",
  Flowers: "💐",
  Rentals: "🪑",
  Attire: "👗",
  Beauty: "💄",
  Transportation: "🚗",
  Decorations: "🎀",
  Invitations: "✉️",
  Events: "🎉",
  Vendors: "🤝",
  Other: "📌",
};

function SortableTaskItem({
  task,
  onToggle,
  onDelete,
  onSelect,
}: {
  task: Task;
  onToggle: (_id: string) => void;
  onDelete: (_id: string) => void;
  onSelect: (_task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const dueDateInfo = task.due_date ? formatDueDate(task.due_date) : null;
  const isOverdue = dueDateInfo?.isOverdue && task.status !== "done";

  // "Just completed" micro-animation
  const [justCompleted, setJustCompleted] = useState(false);
  // Delete is tucked behind a secondary control + inline confirm to avoid
  // accidental deletion from the frequently-used row.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleToggle() {
    // Show animation when task is about to become done (in_progress → done)
    if (task.status === "in_progress") {
      setJustCompleted(true);
    }
    onToggle(task.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(task);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title} (${task.priority} priority)`}
      className={`group relative border-l-[3px] px-4 py-2.5 hover:bg-lavender transition bg-white cursor-pointer focus:outline-none focus-visible:bg-lavender ${PRIORITY_BORDER[task.priority]}`}
    >
      {justCompleted && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-[fadeInOut_1.8s_ease-in-out_forwards]"
          onAnimationEnd={() => setJustCompleted(false)}
        >
          <span className="bg-confirmed-bg text-confirmed-text text-[14px] font-semibold px-4 py-2 rounded-full shadow-sm">
            ✓ Done! One step closer
          </span>
        </div>
      )}
      {/* Top row: drag handle, priority, status, title, due date, open chevron */}
      <div className="flex items-center gap-2">
        {/* Drag handle — hidden on mobile */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="hidden sm:block flex-shrink-0 cursor-grab active:cursor-grabbing text-muted hover:text-plum p-0.5 touch-none"
          aria-label="Drag to reorder"
          title="Drag to reorder tasks"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        {/* High-priority flag — the left accent bar carries medium/low */}
        {task.priority === "high" && task.status !== "done" && (
          <span
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-error bg-error/10 px-1.5 py-0.5 rounded"
            title="High priority"
          >
            High
          </span>
        )}

        {/* Status badge - click to cycle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className={`rounded-full px-2 py-0.5 text-[12px] flex-shrink-0 ${STATUS_CLASSES[task.status]}`}
          title="Click to change status"
        >
          {STATUS_LABELS[task.status]}
        </button>

        {/* Task title */}
        <span
          className={`flex-1 text-[15px] truncate ${
            task.priority === "high" && task.status !== "done" ? "font-semibold" : ""
          } ${
            task.status === "done"
              ? "text-muted line-through"
              : task.status === "in_progress"
              ? "text-violet"
              : "text-plum"
          }`}
        >
          {task.title}
          {(task.notes || task.edyn_message) && (
            <span className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-violet/40 align-middle" title="Has notes or tips" />
          )}
        </span>

        {/* Due date — right-aligned to use the row width */}
        {dueDateInfo && (
          <span
            className={`flex-shrink-0 text-[12px] whitespace-nowrap ${
              isOverdue
                ? "text-error font-semibold"
                : dueDateInfo.isToday
                ? "text-violet font-semibold"
                : "text-muted"
            }`}
          >
            {dueDateInfo.formatted} · {dueDateInfo.relative}
          </span>
        )}

        {/* Open indicator */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 text-muted group-hover:text-violet transition"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </div>

      {/* Bottom row: category, guide, secondary actions — wraps on mobile */}
      <div className="flex items-center gap-2 mt-1 ml-[18px] sm:ml-[34px] flex-wrap">
        {task.category && (
          <span className="badge text-[11px] inline-flex items-center gap-1">
            <span aria-hidden="true">{CATEGORY_ICON[task.category] ?? "📌"}</span>
            {task.category}
          </span>
        )}
        {TASK_GUIDE_MAP[task.title] && (
          <span className="text-[10px] font-semibold text-violet bg-violet/10 px-1.5 py-0.5 rounded-full">
            Guide
          </span>
        )}
        {confirmingDelete ? (
          <span className="ml-auto flex items-center gap-2 text-[12px] flex-shrink-0">
            <span className="text-muted">Delete this task?</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="font-semibold text-error hover:opacity-80"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(false);
              }}
              className="text-muted hover:text-plum"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
            className="ml-auto flex-shrink-0 text-muted hover:text-plum transition p-0.5"
            aria-label="More actions"
            aria-expanded={false}
            title="Delete task"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="13" cy="8" r="1.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskList({ tasks, onToggle, onDelete, onSelect, onReorder }: Props) {
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(
    new Set()
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // Group top-level tasks by phase
  const topLevelTasks = tasks.filter((t) => !t.parent_task_id);

  const grouped = new Map<string, Task[]>();
  for (const task of topLevelTasks) {
    const phase = task.timeline_phase || "Custom Tasks";
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase)!.push(task);
  }

  // Sort phases
  const sortedPhases = [...grouped.keys()].sort((a, b) => {
    const ai = PHASE_ORDER.indexOf(a);
    const bi = PHASE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  function togglePhase(phase: string) {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  function handleDragEnd(phaseTasks: Task[]) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = phaseTasks.findIndex((t) => t.id === active.id);
      const newIndex = phaseTasks.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(phaseTasks, oldIndex, newIndex);
      if (onReorder) {
        onReorder(reordered.map((t) => t.id));
      }
    };
  }

  return (
    // Single column on smaller screens; two columns on wide screens so phase
    // cards fill the available width instead of stretching one sparse column.
    // Row-major order keeps the timeline reading left-to-right, top-to-bottom.
    // items-start lets cards keep their natural height (phases vary in length).
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {sortedPhases.map((phase) => {
        const phaseTasks = grouped.get(phase)!;
        const completed = phaseTasks.filter((t) => t.status === "done").length;
        const collapsed = collapsedPhases.has(phase);
        const phaseInfo = PHASE_LABELS[phase] || { label: phase, hint: "" };

        return (
          <div key={phase} className="rounded-[16px] border-border bg-white overflow-hidden">
            <button
              onClick={() => togglePhase(phase)}
              className="w-full flex items-center justify-between px-4 py-3 bg-lavender hover:opacity-90 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className={`flex-shrink-0 text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-plum">
                      {phaseInfo.label}
                    </span>
                    <span className="text-[12px] text-muted">
                      · {phase !== "Custom Tasks" ? phase : ""}
                    </span>
                    <span className="text-[12px] text-muted">
                      {completed}/{phaseTasks.length}
                    </span>
                  </div>
                  {phaseInfo.hint && (
                    <p className="text-[12px] text-muted mt-0.5 truncate">
                      {phaseInfo.hint}
                    </p>
                  )}
                </div>
              </div>
              {/* Phase progress */}
              <div className="progress-track w-24 flex-shrink-0">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      phaseTasks.length > 0
                        ? (completed / phaseTasks.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </button>

            {!collapsed && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd(phaseTasks)}
              >
                <SortableContext
                  items={phaseTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-border">
                    {phaseTasks.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        );
      })}
    </div>
  );
}
