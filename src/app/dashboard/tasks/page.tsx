"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { EmptyState } from "@/components/EmptyState";
import { Confetti, triggerConfetti } from "@/components/Confetti";
import { TaskFilters } from "./TaskFilters";
import { trackTaskCreated, trackTaskCompleted } from "@/lib/analytics";

// Dynamic imports for heavy components (dnd-kit, react-pdf in detail)
const TaskList = dynamic(() => import("./TaskList").then((m) => ({ default: m.TaskList })), {
  loading: () => <SkeletonList count={6} />,
});
const TaskDetail = dynamic(() => import("./TaskDetail").then((m) => ({ default: m.TaskDetail })));
const TaskCalendar = dynamic(() => import("./TaskCalendar").then((m) => ({ default: m.TaskCalendar })), {
  loading: () => <SkeletonList count={4} />,
});

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

const ADD_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Flowers",
  "Music",
  "Attire",
  "Invitations",
  "Planning",
  "Other",
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [noWedding, setNoWedding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [showAddTask, setShowAddTask] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const calendarMenuRef = useRef<HTMLDivElement>(null);

  // Close calendar menu on outside click
  useEffect(() => {
    if (!showCalendarMenu) return;
    function handleClick(e: MouseEvent) {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(e.target as Node)) {
        setShowCalendarMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCalendarMenu]);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => {
        if (res.status === 404) { setNoWedding(true); return []; }
        return res.ok ? res.json() : Promise.reject();
      })
      .then(setTasks)
      .catch(() => toast.error("Couldn't load your tasks. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  const allCategories = useMemo(
    () => [...new Set(tasks.map((t) => t.category).filter(Boolean) as string[])],
    [tasks]
  );

  const allPhases = useMemo(
    () =>
      [...new Set(tasks.map((t) => t.timeline_phase).filter(Boolean) as string[])],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterPhase && t.timeline_phase !== filterPhase) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterStatus === "done" && t.status !== "done") return false;
      if (filterStatus === "in_progress" && t.status !== "in_progress") return false;
      if (filterStatus === "not_started" && t.status !== "not_started") return false;
      if (filterStatus === "overdue") {
        if (t.status === "done") return false;
        if (!t.due_date) return false;
        if (new Date(t.due_date) >= new Date()) return false;
      }
      return true;
    });
  }, [tasks, filterCategory, filterPhase, filterStatus, filterPriority]);

  const completed = tasks.filter((t) => t.status === "done" && !t.parent_task_id).length;
  const total = tasks.filter((t) => !t.parent_task_id).length;

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const tempId = crypto.randomUUID();
    const task: Task = {
      id: tempId,
      title: title.trim(),
      description: null,
      category,
      due_date: dueDate || null,
      completed: false,
      status: "not_started",
      priority,
      edyn_message: null,
      timeline_phase: null,
      is_system_generated: false,
      notes: null,
      parent_task_id: null,
    };

    setTasks((prev) => [...prev, task]);
    setTitle("");
    setDueDate("");
    setPriority("medium");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          category: task.category,
          due_date: task.due_date,
          priority: task.priority,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
      trackTaskCreated();
      toast.success("Task added");
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast.error("That task didn't save. Try again.");
    }
  }

  async function cycleStatus(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const nextStatus: Record<string, "not_started" | "in_progress" | "done"> = {
      not_started: "in_progress",
      in_progress: "done",
      done: "not_started",
    };
    const newStatus = nextStatus[task.status];
    const newCompleted = newStatus === "done";

    const prev = tasks;
    setTasks((t) =>
      t.map((x) =>
        x.id === id ? { ...x, status: newStatus, completed: newCompleted } : x
      )
    );
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, status: newStatus, completed: newCompleted });
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, completed: newCompleted }),
      });
      if (!res.ok) throw new Error();

      if (newStatus === "done") {
        trackTaskCompleted();
        // Check if all tasks in this phase are now complete
        if (task.timeline_phase) {
          const phaseTasks = tasks.filter(
            (t) => t.timeline_phase === task.timeline_phase && !t.parent_task_id
          );
          const allPhaseDone = phaseTasks.every(
            (t) => t.id === id ? true : t.status === "done"
          );
          if (allPhaseDone) {
            triggerConfetti();
          }
        }

        const prevStatus = task.status;
        toast("Task completed", {
          action: {
            label: "Undo",
            onClick: () => {
              const rollbackCompleted = prevStatus === "done";
              setTasks((t) =>
                t.map((x) =>
                  x.id === id ? { ...x, status: prevStatus, completed: rollbackCompleted } : x
                )
              );
              if (selectedTask?.id === id) {
                setSelectedTask((s) => s ? { ...s, status: prevStatus, completed: rollbackCompleted } : s);
              }
              fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: prevStatus, completed: rollbackCompleted }),
              }).catch(() => toast.error("Couldn't undo that change."));
            },
          },
        });
      }
    } catch {
      setTasks(prev);
      toast.error("Changes didn't save. Try again.");
    }
  }

  async function updateStatus(id: string, status: "not_started" | "in_progress" | "done") {
    const prev = tasks;
    const newCompleted = status === "done";
    setTasks((t) =>
      t.map((x) =>
        x.id === id ? { ...x, status, completed: newCompleted } : x
      )
    );
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, status, completed: newCompleted });
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, completed: newCompleted }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev);
      toast.error("Changes didn't save. Try again.");
    }
  }

  async function updatePriority(id: string, newPriority: "high" | "medium" | "low") {
    const prev = tasks;
    setTasks((t) =>
      t.map((x) => (x.id === id ? { ...x, priority: newPriority } : x))
    );
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, priority: newPriority });
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev);
      toast.error("Priority didn't update. Try again.");
    }
  }

  async function deleteTask(id: string) {
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Task removed");
    } catch {
      setTasks(prev);
      toast.error("Couldn't remove that task. Try again.");
    }
  }

  async function updateNotes(id: string, notes: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, notes } : t))
      );
    } catch {
      toast.error("Notes didn't save. Try again.");
    }
  }

  async function fetchCalendarToken() {
    setCalendarLoading(true);
    try {
      const res = await fetch("/api/tasks/calendar-token");
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      if (token) {
        setCalendarToken(token);
        return token as string;
      }
      // No token yet — create one
      const createRes = await fetch("/api/tasks/calendar-token", { method: "POST" });
      if (!createRes.ok) throw new Error();
      const { token: newToken } = await createRes.json();
      setCalendarToken(newToken);
      return newToken as string;
    } catch {
      toast.error("Couldn't set up calendar sync. Try again.");
      return null;
    } finally {
      setCalendarLoading(false);
    }
  }

  async function handleSubscribe() {
    const token = calendarToken || await fetchCalendarToken();
    if (!token) return;
    const url = `${window.location.origin}/api/public/calendar/${token}`;
    const webcalUrl = url.replace(/^https?:/, "webcal:");
    window.location.href = webcalUrl;
  }

  async function handleDownloadICS() {
    const token = calendarToken || await fetchCalendarToken();
    if (!token) return;
    window.open(`/api/public/calendar/${token}`, "_blank");
  }

  async function handleCopyLink() {
    const token = calendarToken || await fetchCalendarToken();
    if (!token) return;
    const url = `${window.location.origin}/api/public/calendar/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Calendar link copied");
  }

  async function handleRegenerateLink() {
    try {
      const res = await fetch("/api/tasks/calendar-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      setCalendarToken(token);
      toast.success("Calendar link regenerated. Previous subscriptions will stop updating.");
    } catch {
      toast.error("Couldn't regenerate link. Try again.");
    }
  }

  async function reorderTasks(orderedIds: string[]) {
    // Update local state: reorder tasks to match the new order
    setTasks((prev) => {
      const taskMap = new Map(prev.map((t) => [t.id, t]));
      const reordered = orderedIds
        .map((id) => taskMap.get(id))
        .filter(Boolean) as Task[];
      // Merge: put reordered tasks in place, keep other tasks unchanged
      const reorderedSet = new Set(orderedIds);
      const others = prev.filter((t) => !reorderedSet.has(t.id));
      // Find position of first reordered task in original array
      const firstIdx = prev.findIndex((t) => reorderedSet.has(t.id));
      const result = [...others];
      result.splice(firstIdx, 0, ...reordered);
      return result;
    });

    // Persist sort_order for each task
    for (let i = 0; i < orderedIds.length; i++) {
      try {
        await fetch(`/api/tasks/${orderedIds[i]}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: i }),
        });
      } catch {
        // best-effort persistence
      }
    }
  }

  if (loading) {
    return <SkeletonList count={6} />;
  }

  if (noWedding) return <NoWeddingState feature="Tasks" />;

  const subTasks = selectedTask
    ? tasks.filter((t) => t.parent_task_id === selectedTask.id)
    : [];

  return (
    <div>
      <Confetti />
      <div className="flex items-center justify-between">
        <div>
          <h1>Tasks</h1>
          <p className="mt-1 text-[15px] text-muted">
            {completed}/{total} completed
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={viewMode === "calendar" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
          >
            Calendar
          </button>
          <div className="relative ml-2" ref={calendarMenuRef}>
            <button
              onClick={() => setShowCalendarMenu(!showCalendarMenu)}
              className="btn-ghost btn-sm flex items-center gap-1"
              disabled={calendarLoading}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-60">
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Sync
            </button>
            {showCalendarMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-[12px] shadow-lg border border-border z-20 py-1">
                <button
                  onClick={() => { handleSubscribe(); setShowCalendarMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[14px] text-plum hover:bg-lavender/40 transition"
                >
                  <span className="font-semibold">Subscribe to calendar</span>
                  <span className="block text-[12px] text-muted mt-0.5">
                    Auto-updates in Google, Apple, or Outlook
                  </span>
                </button>
                <button
                  onClick={() => { handleDownloadICS(); setShowCalendarMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[14px] text-plum hover:bg-lavender/40 transition"
                >
                  <span className="font-semibold">Download .ics file</span>
                  <span className="block text-[12px] text-muted mt-0.5">
                    One-time import into any calendar app
                  </span>
                </button>
                <button
                  onClick={() => { handleCopyLink(); setShowCalendarMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[14px] text-plum hover:bg-lavender/40 transition"
                >
                  <span className="font-semibold">Copy calendar link</span>
                  <span className="block text-[12px] text-muted mt-0.5">
                    Paste into your calendar app manually
                  </span>
                </button>
                {calendarToken && (
                  <>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        if (confirm("This will break any existing calendar subscriptions. Continue?")) {
                          handleRegenerateLink();
                          setShowCalendarMenu(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-muted hover:bg-lavender/40 transition"
                    >
                      Regenerate link
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters + Add Task */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <TaskFilters
          categories={allCategories}
          phases={allPhases}
          selectedCategory={filterCategory}
          selectedPhase={filterPhase}
          selectedStatus={filterStatus}
          selectedPriority={filterPriority}
          onCategoryChange={setFilterCategory}
          onPhaseChange={setFilterPhase}
          onStatusChange={setFilterStatus}
          onPriorityChange={setFilterPriority}
        />
        <button
          type="button"
          onClick={() => setShowAddTask(true)}
          className="btn-primary btn-sm flex items-center gap-1.5 ml-auto"
        >
          <span className="text-[16px] leading-none">+</span> Add Task
        </button>
      </div>

      {/* Add task modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-plum">Add Task</h2>
              <button
                type="button"
                onClick={() => setShowAddTask(false)}
                className="text-muted hover:text-plum text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                addTask(e);
                setShowAddTask(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[13px] text-muted">Task name</label>
                <input
                  type="text"
                  placeholder="e.g. Book florist consultation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] text-muted">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                  >
                    {ADD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] text-muted">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[13px] text-muted">Due date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View */}
      <div className="mt-6">
        {viewMode === "list" ? (
          filteredTasks.length > 0 ? (
            <TaskList
              tasks={filteredTasks}
              onToggle={cycleStatus}
              onDelete={deleteTask}
              onSelect={setSelectedTask}
              onReorder={reorderTasks}
            />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon="✓"
              title="No tasks yet"
              message="Tasks will be generated when you complete onboarding with a wedding date."
            />
          ) : (
            <p className="text-[15px] text-muted text-center py-8">
              No tasks match your filters.
            </p>
          )
        ) : (
          <TaskCalendar
            tasks={filteredTasks}
            onSelectTask={setSelectedTask}
          />
        )}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          subTasks={subTasks}
          allTasks={tasks}
          onClose={() => setSelectedTask(null)}
          onToggle={cycleStatus}
          onUpdateNotes={updateNotes}
          onUpdatePriority={updatePriority}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}
