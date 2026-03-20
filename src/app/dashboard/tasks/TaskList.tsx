"use client";

import { useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_date: string | null;
  completed: boolean;
  status: "not_started" | "in_progress" | "done";
  priority: "high" | "medium" | "low";
  edyn_message: string | null;
  timeline_phase: string | null;
  is_system_generated: boolean;
  notes: string | null;
  parent_task_id: string | null;
};

type Props = {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (task: Task) => void;
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

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-error",
  medium: "bg-[#D4A017]",
  low: "bg-transparent",
};

export function TaskList({ tasks, onToggle, onDelete, onSelect }: Props) {
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(
    new Set()
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

  return (
    <div className="space-y-4">
      {sortedPhases.map((phase) => {
        const phaseTasks = grouped.get(phase)!;
        const completed = phaseTasks.filter((t) => t.status === "done").length;
        const collapsed = collapsedPhases.has(phase);

        return (
          <div key={phase} className="rounded-[16px] border-border bg-white overflow-hidden">
            <button
              onClick={() => togglePhase(phase)}
              className="w-full flex items-center justify-between px-4 py-3 bg-lavender hover:opacity-90 transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted">
                  {collapsed ? "+" : "-"}
                </span>
                <span className="text-[15px] font-semibold text-plum">
                  {phase}
                </span>
                <span className="text-[12px] text-muted">
                  {completed}/{phaseTasks.length}
                </span>
              </div>
              {/* Phase progress */}
              <div className="progress-track w-24">
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
              <div className="divide-y divide-border">
                {phaseTasks.map((task) => {
                  const isOverdue =
                    task.due_date &&
                    task.status !== "done" &&
                    new Date(task.due_date) < new Date();

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-lavender transition"
                    >
                      {/* Priority dot */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]} ${
                          task.priority === "low" ? "border border-border" : ""
                        }`}
                      />

                      {/* Status badge - click to cycle */}
                      <button
                        onClick={() => onToggle(task.id)}
                        className={`rounded-full px-2 py-0.5 text-[12px] flex-shrink-0 ${STATUS_CLASSES[task.status]}`}
                      >
                        {STATUS_LABELS[task.status]}
                      </button>

                      {/* Task title */}
                      <button
                        onClick={() => onSelect(task)}
                        className={`flex-1 text-[15px] text-left ${
                          task.status === "done"
                            ? "text-muted line-through"
                            : task.status === "in_progress"
                            ? "text-violet"
                            : "text-plum"
                        }`}
                      >
                        {task.title}
                      </button>

                      {task.category && (
                        <span className="badge">
                          {task.category}
                        </span>
                      )}
                      {task.due_date && (
                        <span
                          className={`text-[12px] flex-shrink-0 ${
                            isOverdue
                              ? "text-error font-semibold"
                              : "text-muted"
                          }`}
                        >
                          {task.due_date}
                        </span>
                      )}
                      {!task.is_system_generated && (
                        <button
                          onClick={() => onDelete(task.id)}
                          className="text-[12px] text-error hover:opacity-80 flex-shrink-0"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
