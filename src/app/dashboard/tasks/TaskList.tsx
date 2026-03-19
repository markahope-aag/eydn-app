"use client";

import { useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_date: string | null;
  completed: boolean;
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
        const completed = phaseTasks.filter((t) => t.completed).length;
        const collapsed = collapsedPhases.has(phase);

        return (
          <div key={phase} className="rounded-xl border bg-white overflow-hidden">
            <button
              onClick={() => togglePhase(phase)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {collapsed ? "+" : "-"}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {phase}
                </span>
                <span className="text-xs text-gray-400">
                  {completed}/{phaseTasks.length}
                </span>
              </div>
              {/* Phase progress */}
              <div className="w-24 h-1.5 rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all"
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
              <div className="divide-y">
                {phaseTasks.map((task) => {
                  const isOverdue =
                    task.due_date &&
                    !task.completed &&
                    new Date(task.due_date) < new Date();

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggle(task.id)}
                        className="h-4 w-4 rounded accent-rose-600 flex-shrink-0"
                      />
                      <button
                        onClick={() => onSelect(task)}
                        className={`flex-1 text-sm text-left ${
                          task.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {task.title}
                      </button>
                      {task.category && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {task.category}
                        </span>
                      )}
                      {task.due_date && (
                        <span
                          className={`text-xs flex-shrink-0 ${
                            isOverdue
                              ? "text-red-500 font-medium"
                              : "text-gray-400"
                          }`}
                        >
                          {task.due_date}
                        </span>
                      )}
                      {!task.is_system_generated && (
                        <button
                          onClick={() => onDelete(task.id)}
                          className="text-xs text-red-500 hover:text-red-400 flex-shrink-0"
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
