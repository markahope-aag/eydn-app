"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [emailReminders, setEmailReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/weddings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((wedding) => {
        setWeddingId(wedding.id);
        return fetch(`/api/settings`);
      })
      .then((r) => (r.ok ? r.json() : null))
      .then((prefs) => {
        if (prefs) {
          setEmailReminders(prefs.email_reminders);
          setReminderDays(prefs.reminder_days_before);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    if (!weddingId) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_reminders: emailReminders,
          reminder_days_before: reminderDays,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  return (
    <div className="max-w-lg">
      <h1>Settings</h1>
      <p className="mt-1 text-[15px] text-muted">
        Manage your notification preferences
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="accent-violet"
            />
            <div>
              <p className="text-[15px] font-semibold text-plum">
                Email reminders
              </p>
              <p className="text-[12px] text-muted">
                Receive email notifications for upcoming task deadlines
              </p>
            </div>
          </label>
        </div>

        <div>
          <label className="text-[15px] font-semibold text-muted">
            Remind me before deadline
          </label>
          <select
            value={reminderDays}
            onChange={(e) => setReminderDays(Number(e.target.value))}
            className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
          >
            <option value={3}>3 days before</option>
            <option value={7}>7 days before</option>
            <option value={14}>14 days before</option>
            <option value={30}>30 days before</option>
          </select>
        </div>

        <button
          onClick={saveSettings}
          className="btn-primary"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
