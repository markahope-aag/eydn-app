"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { CronData } from "./types";

export default function CronJobsTab({
  cronData,
  cronLoading,
  onLoad,
}: {
  cronData: CronData | null;
  cronLoading: boolean;
  onLoad: () => void;
}) {
  const [runningJob, setRunningJob] = useState<string | null>(null);
  useEffect(() => { onLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (cronLoading) {
    return <p className="text-[15px] text-muted py-8">Loading cron job data...</p>;
  }

  if (!cronData) {
    return <p className="text-[15px] text-muted py-8">Unable to load cron data.</p>;
  }

  const now = new Date();
  function timeAgo(dateStr: string) {
    const diff = now.getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Job Status Cards */}
      <div>
        <h2 className="text-[18px] font-semibold text-plum">Scheduled Jobs</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cronData.jobs.map((job) => (
            <div key={job.name} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[16px] font-semibold text-plum capitalize">{job.name}</p>
                <span className={`w-3 h-3 rounded-full ${
                  job.stats.lastStatus === "success" ? "bg-green-500" :
                  job.stats.lastStatus === "error" ? "bg-red-500" :
                  "bg-gray-300"
                }`} />
              </div>
              <p className="mt-1 text-[13px] text-muted">{job.description}</p>
              <div className="mt-3 space-y-1 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted">Schedule</span>
                  <span className="font-mono text-plum">{job.schedule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Last run</span>
                  <span className="text-plum">
                    {job.stats.lastRun ? timeAgo(job.stats.lastRun) : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Last duration</span>
                  <span className="text-plum">
                    {job.stats.lastDuration ? `${(job.stats.lastDuration / 1000).toFixed(1)}s` : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Success / Error</span>
                  <span>
                    <span className="text-green-600 font-semibold">{job.stats.successCount}</span>
                    {" / "}
                    <span className={`font-semibold ${job.stats.errorCount > 0 ? "text-red-600" : "text-muted"}`}>{job.stats.errorCount}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  setRunningJob(job.name);
                  try {
                    const res = await fetch("/api/admin/cron", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ job: job.name }),
                    });
                    const data = await res.json();
                    if (data.success) toast.success(`${job.name} completed successfully`);
                    else toast.error(`${job.name} failed: ${data.result?.error || "Unknown error"}`);
                  } catch { toast.error(`Failed to trigger ${job.name}`); }
                  finally { setRunningJob(null); }
                }}
                disabled={runningJob !== null}
                className="mt-3 w-full btn-ghost btn-sm disabled:opacity-50 text-[13px]"
              >
                {runningJob === job.name ? "Running..." : "Run Now"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History */}
      <div>
        <h2 className="text-[18px] font-semibold text-plum">Execution History</h2>
        {cronData.recentExecutions.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-[16px] border border-border bg-white">
            <table className="w-full text-[14px]">
              <thead className="border-b border-border bg-lavender">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Job</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cronData.recentExecutions.map((exec) => (
                  <tr key={exec.id}>
                    <td className="px-4 py-3 font-semibold text-plum capitalize">{exec.job_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                        exec.status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {exec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(1)}s` : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(exec.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted text-[12px] max-w-[200px] truncate">
                      {exec.error_message || (exec.details ? JSON.stringify(exec.details).slice(0, 80) : "-")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-muted">No cron executions recorded yet. Jobs will appear here after their first run.</p>
        )}
      </div>
    </div>
  );
}
