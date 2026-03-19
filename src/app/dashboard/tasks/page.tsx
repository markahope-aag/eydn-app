"use client";

import { useState } from "react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  category: string;
  due_date: string | null;
  completed: boolean;
};

const categories = [
  "Venue",
  "Catering",
  "Photography",
  "Flowers",
  "Music",
  "Attire",
  "Invitations",
  "Other",
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [dueDate, setDueDate] = useState("");

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category,
      due_date: dueDate || null,
      completed: false,
    };

    setTasks((prev) => [...prev, task]);
    setTitle("");
    setDueDate("");
    toast.success("Task added");
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast("Task removed");
  }

  const completed = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
      <p className="mt-1 text-sm text-gray-500">
        {completed}/{tasks.length} completed
      </p>

      <form onSubmit={addTask} className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm flex-1"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Add
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="h-4 w-4 rounded accent-rose-600"
            />
            <span
              className={`flex-1 text-sm ${
                task.completed
                  ? "text-gray-400 line-through"
                  : "text-gray-900"
              }`}
            >
              {task.title}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {task.category}
            </span>
            {task.due_date && (
              <span className="text-xs text-gray-400">{task.due_date}</span>
            )}
            <button
              onClick={() => removeTask(task.id)}
              className="text-xs text-red-500 hover:text-red-400"
            >
              Delete
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No tasks yet. Add one above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
