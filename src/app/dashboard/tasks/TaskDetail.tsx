"use client";

import { EdynMessage } from "@/components/EdynMessage";

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
  task: Task;
  subTasks: Task[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
};

export function TaskDetail({ task, subTasks, onClose, onToggle, onUpdateNotes }: Props) {
  const isOverdue =
    task.due_date && !task.completed && new Date(task.due_date) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{task.title}</h2>
              <div className="mt-1 flex gap-2 flex-wrap">
                {task.category && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {task.category}
                  </span>
                )}
                {task.timeline_phase && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                    {task.timeline_phase}
                  </span>
                )}
                {isOverdue && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Due date + status */}
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task.id)}
                className="accent-rose-600"
              />
              {task.completed ? "Completed" : "Mark as complete"}
            </label>
            {task.due_date && (
              <span className={`text-sm ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                Due: {task.due_date}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-4 text-sm text-gray-600">{task.description}</p>
          )}

          {/* Edyn message */}
          {task.edyn_message && (
            <div className="mt-4">
              <EdynMessage message={task.edyn_message} />
            </div>
          )}

          {/* Sub-tasks */}
          {subTasks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Sub-tasks
              </h3>
              <div className="space-y-1">
                {subTasks.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => onToggle(sub.id)}
                      className="accent-rose-600"
                    />
                    <span
                      className={
                        sub.completed
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }
                    >
                      {sub.title}
                    </span>
                    {sub.due_date && (
                      <span className="ml-auto text-xs text-gray-400">
                        {sub.due_date}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-700">Notes</label>
            <textarea
              defaultValue={task.notes || ""}
              onBlur={(e) => onUpdateNotes(task.id, e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
