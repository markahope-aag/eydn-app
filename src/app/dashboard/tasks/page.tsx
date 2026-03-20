"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { TaskList } from "./TaskList";
import { TaskDetail } from "./TaskDetail";
import { TaskFilters } from "./TaskFilters";

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
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setTasks)
      .catch(() => toast.error("Failed to load tasks"))
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
      if (filterStatus === "completed" && !t.completed) return false;
      if (filterStatus === "pending" && t.completed) return false;
      if (filterStatus === "overdue") {
        if (t.completed) return false;
        if (!t.due_date) return false;
        if (new Date(t.due_date) >= new Date()) return false;
      }
      return true;
    });
  }, [tasks, filterCategory, filterPhase, filterStatus]);

  const completed = tasks.filter((t) => t.completed && !t.parent_task_id).length;
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
      edyn_message: null,
      timeline_phase: null,
      is_system_generated: false,
      notes: null,
      parent_task_id: null,
    };

    setTasks((prev) => [...prev, task]);
    setTitle("");
    setDueDate("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          category: task.category,
          due_date: task.due_date,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
      toast.success("Task added");
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast.error("Failed to add task");
    }
  }

  async function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const prev = tasks;
    const newCompleted = !task.completed;
    setTasks((t) =>
      t.map((x) => (x.id === id ? { ...x, completed: newCompleted } : x))
    );
    if (selectedTask?.id === id) {
      setSelectedTask({ ...selectedTask, completed: newCompleted });
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev);
      toast.error("Failed to update task");
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
      toast.error("Failed to remove task");
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
      toast.error("Failed to save notes");
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading tasks...</p>;
  }

  const subTasks = selectedTask
    ? tasks.filter((t) => t.parent_task_id === selectedTask.id)
    : [];

  return (
    <div>
      <h1>Tasks</h1>
      <p className="mt-1 text-[15px] text-muted">
        {completed}/{total} completed
      </p>

      {/* Filters */}
      <div className="mt-4">
        <TaskFilters
          categories={allCategories}
          phases={allPhases}
          selectedCategory={filterCategory}
          selectedPhase={filterPhase}
          selectedStatus={filterStatus}
          onCategoryChange={setFilterCategory}
          onPhaseChange={setFilterPhase}
          onStatusChange={setFilterStatus}
        />
      </div>

      {/* Add task form */}
      <form onSubmit={addTask} className="mt-4 flex gap-3">
        <input
          type="text"
          placeholder="Add a custom task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px]"
        >
          {ADD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px]"
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add
        </button>
      </form>

      {/* Task list grouped by phase */}
      <div className="mt-6">
        {filteredTasks.length > 0 ? (
          <TaskList
            tasks={filteredTasks}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onSelect={setSelectedTask}
          />
        ) : (
          <p className="text-[15px] text-muted text-center py-8">
            {tasks.length === 0
              ? "No tasks yet. Complete onboarding to generate your timeline, or add tasks above."
              : "No tasks match your filters."}
          </p>
        )}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          subTasks={subTasks}
          onClose={() => setSelectedTask(null)}
          onToggle={toggleTask}
          onUpdateNotes={updateNotes}
        />
      )}
    </div>
  );
}
