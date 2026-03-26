"use client";

import { useState, useEffect } from "react";

type Alert = {
  id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  affected_tasks: { title: string; due_date: string }[];
  message: string;
  created_at: string;
};

export function DateSyncBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/date-alerts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAlerts(data || []))
      .catch(() => {});
  }, []);

  async function acknowledge(alertId: string) {
    setAcknowledging(alertId);
    try {
      const res = await fetch("/api/date-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } finally {
      setAcknowledging(null);
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-[16px] border-2 border-amber-400 bg-amber-50 px-5 py-4"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-amber-900">
                {alert.change_type === "wedding_date" ? "Wedding Date Changed" : "Ceremony Time Changed"}
              </p>
              <p className="text-[13px] text-amber-800 mt-1">{alert.message}</p>

              {alert.affected_tasks && alert.affected_tasks.length > 0 && (
                <div className="mt-3">
                  <p className="text-[12px] font-semibold text-amber-900 mb-1">
                    These tasks may need rescheduling with your vendors:
                  </p>
                  <ul className="space-y-0.5">
                    {alert.affected_tasks.map((task, i) => (
                      <li key={i} className="text-[12px] text-amber-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="font-medium">{task.title}</span>
                        {task.due_date && (
                          <span className="text-amber-600">
                            (was {new Date(task.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => acknowledge(alert.id)}
                  disabled={acknowledging === alert.id}
                  className="rounded-[10px] bg-amber-600 text-white px-4 py-1.5 text-[13px] font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {acknowledging === alert.id ? "Acknowledging..." : "I understand — I will update affected appointments"}
                </button>
                <p className="text-[11px] text-amber-600">
                  This banner will remain until acknowledged.
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
