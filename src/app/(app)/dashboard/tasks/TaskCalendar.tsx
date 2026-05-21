"use client";

import { useState, useMemo } from "react";
import type { Task } from "./types";

type Props = {
  tasks: Task[];
  onSelectTask: (_task: Task) => void;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TaskCalendar({ tasks, onSelectTask }: Props) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  // Pad to fill last row
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  // Map tasks by date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      if (!map.has(task.due_date)) map.set(task.due_date, []);
      map.get(task.due_date)!.push(task);
    }
    return map;
  }, [tasks]);

  function dateStr(day: number) {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  }

  function dotColor(task: Task): string {
    if (task.status === "done") return "bg-[#2E8B57]";
    if (
      task.due_date &&
      new Date(task.due_date) < today
    ) {
      return "bg-error";
    }
    return "bg-violet";
  }

  // Tinted pill style for the in-cell task previews.
  function chipClass(task: Task): string {
    if (task.status === "done") return "bg-[#2E8B57]/10 text-[#2E8B57] line-through";
    if (task.due_date && new Date(task.due_date) < today) {
      return "bg-error/10 text-error";
    }
    return "bg-lavender text-violet";
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", {
    month: "long",
  });

  const selectedTasks = selectedDate ? tasksByDate.get(selectedDate) || [] : [];

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="btn-ghost btn-sm">
          &larr; Prev
        </button>
        <span className="text-[15px] font-semibold text-plum">
          {monthName} {currentYear}
        </span>
        <button onClick={nextMonth} className="btn-ghost btn-sm">
          Next &rarr;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[12px] text-muted font-semibold py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-[16px] overflow-hidden">
        {calendarDays.map((day, i) => {
          if (day === null) {
            return (
              <div key={`empty-${i}`} className="bg-whisper min-h-[104px]" />
            );
          }

          const ds = dateStr(day);
          const dayTasks = tasksByDate.get(ds) || [];
          const isToday =
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();
          const isSelected = selectedDate === ds;

          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(isSelected ? null : ds)}
              className={`bg-white min-h-[104px] p-1.5 text-left hover:bg-lavender transition flex flex-col overflow-hidden ${
                isSelected ? "ring-2 ring-violet" : ""
              }`}
            >
              <span
                className={`text-[13px] ${
                  isToday
                    ? "text-violet font-semibold"
                    : "text-plum"
                }`}
              >
                {day}
              </span>
              {dayTasks.length > 0 && (
                <div className="mt-1 flex flex-col gap-0.5 min-w-0">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      title={t.title}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${chipClass(t)}`}
                    >
                      {t.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-muted px-1 mt-0.5">
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date tasks */}
      {selectedDate && (
        <div className="mt-4 rounded-[16px] border-border bg-white p-4">
          <h3 className="text-[15px] font-semibold text-plum mb-2">
            Tasks for {selectedDate}
          </h3>
          {selectedTasks.length === 0 ? (
            <p className="text-[13px] text-muted">No tasks due on this date.</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="w-full flex items-center gap-2 rounded-[10px] border-border px-3 py-2 hover:bg-lavender transition text-left"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor(task)}`}
                  />
                  <span
                    className={`text-[15px] flex-1 ${
                      task.status === "done"
                        ? "text-muted line-through"
                        : "text-plum"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="badge">{task.category}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
