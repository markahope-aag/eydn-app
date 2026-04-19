"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type PhaseData = {
  active: number;
  post_wedding: number;
  archived: number;
  sunset: number;
};

type SunsetWedding = {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  months_until_sunset: number;
};

type LifecycleStats = {
  phases: PhaseData;
  total_weddings: number;
  memory_plan_subscribers: number;
  emails_sent: Record<string, number>;
  upcoming_sunsets: SunsetWedding[];
};

const PHASE_CONFIG: { key: keyof PhaseData; label: string; color: string; description: string }[] = [
  { key: "active", label: "Active", color: "bg-green-500", description: "Planning their wedding" },
  { key: "post_wedding", label: "Post-Wedding", color: "bg-blue-500", description: "0-12 months post-wedding" },
  { key: "archived", label: "Archived", color: "bg-yellow-500", description: "12-24 months, read-only" },
  { key: "sunset", label: "Sunset", color: "bg-red-500", description: "Data deleted" },
];

const EMAIL_LABELS: Record<string, string> = {
  post_wedding_welcome: "Post-Wedding Welcome",
  download_reminder_1mo: "1-Month Reminder",
  download_reminder_6mo: "6-Month Reminder",
  download_reminder_9mo: "9-Month Warning",
  memory_plan_offer: "Memory Plan Offer",
  archive_notice: "Archive Notice",
  sunset_warning_21mo: "Sunset Warning (21mo)",
  sunset_final: "Final Deletion Notice",
};

const EMAIL_ORDER = [
  "post_wedding_welcome",
  "download_reminder_1mo",
  "download_reminder_6mo",
  "download_reminder_9mo",
  "memory_plan_offer",
  "archive_notice",
  "sunset_warning_21mo",
  "sunset_final",
];

export default function LifecyclePage() {
  const [stats, setStats] = useState<LifecycleStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/lifecycle-stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStats)
      .catch(() => toast.error("Failed to load lifecycle stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading lifecycle data...</p>;
  }

  if (!stats) {
    return <p className="text-[15px] text-muted py-8">Failed to load data.</p>;
  }

  const total = stats.total_weddings || 1; // avoid divide by zero

  return (
    <div className="max-w-4xl">
      <h1>Account Lifecycle</h1>
      <p className="mt-1 text-[15px] text-muted">
        Overview of wedding account phases, email delivery, and Memory Plan adoption.
      </p>

      {/* Phase distribution */}
      <div className="mt-6">
        <h2 className="text-[15px] font-semibold text-plum mb-3">Account Phases</h2>

        {/* Phase bar */}
        <div className="flex h-8 rounded-[10px] overflow-hidden">
          {PHASE_CONFIG.map(({ key, color }) => {
            const count = stats.phases[key];
            const pct = (count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={key}
                className={`${color} flex items-center justify-center text-white text-[11px] font-semibold transition-all`}
                style={{ width: `${Math.max(pct, 3)}%` }}
              >
                {pct >= 8 ? `${Math.round(pct)}%` : ""}
              </div>
            );
          })}
        </div>

        {/* Phase cards */}
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {PHASE_CONFIG.map(({ key, label, color, description }) => (
            <div key={key} className="rounded-[12px] border border-border bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-[13px] font-semibold text-plum">{label}</span>
              </div>
              <p className="text-[28px] font-bold text-plum">{stats.phases[key]}</p>
              <p className="text-[11px] text-muted mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Plan */}
      <div className="mt-6 rounded-[12px] border border-border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-plum">Memory Plan Subscribers</h2>
            <p className="text-[12px] text-muted mt-0.5">Active $29/year subscriptions</p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold text-violet">{stats.memory_plan_subscribers}</p>
            {stats.phases.archived > 0 && (
              <p className="text-[11px] text-muted">
                {Math.round((stats.memory_plan_subscribers / Math.max(stats.phases.archived + stats.memory_plan_subscribers, 1)) * 100)}% of post-archive accounts
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Email delivery stats */}
      <div className="mt-6">
        <h2 className="text-[15px] font-semibold text-plum mb-3">Lifecycle Emails Sent</h2>
        <div className="rounded-[12px] border border-border bg-white overflow-hidden">
          {EMAIL_ORDER.map((type, i) => {
            const count = stats.emails_sent[type] || 0;
            const label = EMAIL_LABELS[type] || type;
            return (
              <div
                key={type}
                className={`flex items-center justify-between px-4 py-2.5 ${
                  i % 2 === 1 ? "bg-lavender/20" : ""
                }`}
              >
                <span className="text-[14px] text-plum">{label}</span>
                <span className="text-[14px] font-semibold text-plum">{count}</span>
              </div>
            );
          })}
          {/* Show any additional email types not in the standard list */}
          {Object.entries(stats.emails_sent)
            .filter(([type]) => !EMAIL_ORDER.includes(type))
            .map(([type, count]) => (
              <div key={type} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[14px] text-muted">{type}</span>
                <span className="text-[14px] font-semibold text-muted">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Upcoming sunsets */}
      <div className="mt-6">
        <h2 className="text-[15px] font-semibold text-plum mb-3">
          Approaching Sunset
          {stats.upcoming_sunsets.length > 0 && (
            <span className="ml-2 text-[12px] font-normal text-muted">
              ({stats.upcoming_sunsets.length} within 6 months)
            </span>
          )}
        </h2>
        {stats.upcoming_sunsets.length === 0 ? (
          <p className="text-[13px] text-muted py-4">
            No accounts approaching sunset in the next 6 months.
          </p>
        ) : (
          <div className="rounded-[12px] border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-lavender/30 text-[12px] font-semibold text-muted">
              <span className="flex-1">Couple</span>
              <span className="w-28 text-right">Wedding Date</span>
              <span className="w-36 text-right">Until Sunset</span>
            </div>
            {stats.upcoming_sunsets.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-border">
                <span className="flex-1 text-[14px] text-plum font-semibold">
                  {w.partner1_name} & {w.partner2_name}
                </span>
                <span className="w-28 text-right text-[13px] text-muted">
                  {new Date(w.wedding_date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className={`w-36 text-right text-[13px] font-semibold ${
                  w.months_until_sunset <= 1 ? "text-error" : w.months_until_sunset <= 3 ? "text-yellow-600" : "text-muted"
                }`}>
                  {w.months_until_sunset <= 0
                    ? "Imminent"
                    : w.months_until_sunset < 1
                    ? "< 1 month"
                    : `${w.months_until_sunset} months`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
