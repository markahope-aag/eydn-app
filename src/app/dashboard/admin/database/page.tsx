"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

type DbStats = {
  tables: Record<string, number>;
  storage: { totalAttachments: number };
  growth: {
    weddingsLast7d: number;
    weddingsLast30d: number;
    guestsLast7d: number;
    tasksLast7d: number;
    chatMessagesLast7d: number;
    chatMessagesLast30d: number;
  };
  softDeleted: Record<string, number>;
  backup: {
    lastBackupAt: string | null;
    lastBackupStatus: string | null;
    lastBackupDuration: number | null;
    backupsLast7d: number;
    backupErrorsLast7d: number;
    sftpConfigured: boolean;
  };
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DatabasePage() {
  const [data, setData] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);

  useEffect(() => {
    fetch("/api/admin/db-stats")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => toast.error("Failed to load database stats"))
      .finally(() => setLoading(false));
  }, []);

  async function handleManualBackup() {
    setTriggeringBackup(true);
    try {
      const res = await fetch("/api/admin/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: "backup" }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Backup triggered successfully");
      } else {
        toast.error(result.error || "Backup failed");
      }
    } catch {
      toast.error("Failed to trigger backup");
    } finally {
      setTriggeringBackup(false);
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading database stats...</p>;
  }

  if (forbidden) {
    return (
      <div className="max-w-lg">
        <h1>Access Denied</h1>
        <p className="mt-2 text-[15px] text-muted">You don&apos;t have admin access.</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[15px] text-muted py-8">Failed to load data.</p>;
  }

  // Derived values
  const totalRecords = Object.values(data.tables).reduce((a, b) => a + b, 0);
  const recordsLast7d =
    data.growth.weddingsLast7d +
    data.growth.guestsLast7d +
    data.growth.tasksLast7d +
    data.growth.chatMessagesLast7d;
  const totalSoftDeleted = Object.values(data.softDeleted).reduce((a, b) => a + b, 0);

  // Chart data — sorted largest first
  const chartData = Object.entries(data.tables)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const chartHeight = Math.max(400, Object.keys(data.tables).length * 28);

  return (
    <div className="space-y-8">
      <h1>Database &amp; Backups</h1>

      {/* Health Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-border bg-white p-4">
          <p className="text-[13px] text-muted">Total Records</p>
          <p className="text-[28px] font-bold text-plum">{totalRecords.toLocaleString()}</p>
          <p className="text-[11px] text-muted mt-1">Across {Object.keys(data.tables).length} tables</p>
        </div>
        <div className="rounded-[12px] border border-border bg-white p-4">
          <p className="text-[13px] text-muted">Added Last 7 Days</p>
          <p className="text-[28px] font-bold text-plum">{recordsLast7d.toLocaleString()}</p>
          <p className="text-[11px] text-muted mt-1">Weddings, guests, tasks, chat</p>
        </div>
        <div className="rounded-[12px] border border-border bg-white p-4">
          <p className="text-[13px] text-muted">Soft-Deleted Records</p>
          <p className={`text-[28px] font-bold ${totalSoftDeleted > 0 ? "text-amber-600" : "text-plum"}`}>
            {totalSoftDeleted.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted mt-1">Potential cleanup</p>
        </div>
        <div className="rounded-[12px] border border-border bg-white p-4">
          <p className="text-[13px] text-muted">Last Backup</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                data.backup.lastBackupStatus === "success"
                  ? "bg-green-500"
                  : data.backup.lastBackupStatus === "error"
                    ? "bg-red-500"
                    : "bg-gray-400"
              }`}
            />
            <span className="text-[15px] font-semibold text-plum">
              {data.backup.lastBackupStatus
                ? data.backup.lastBackupStatus.charAt(0).toUpperCase() +
                  data.backup.lastBackupStatus.slice(1)
                : "No backups"}
            </span>
          </div>
          {data.backup.lastBackupAt && (
            <p className="text-[11px] text-muted mt-1">{timeAgo(data.backup.lastBackupAt)}</p>
          )}
        </div>
      </div>

      {/* Table Sizes — horizontal BarChart */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Table Sizes</h2>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <RechartsTooltip />
            <Bar dataKey="count" fill="#2C3E2D" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Growth (7-Day Activity) */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Growth (7-Day Activity)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">New Weddings (7d)</p>
            <p className="text-[28px] font-bold text-plum">{data.growth.weddingsLast7d}</p>
          </div>
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">New Guests (7d)</p>
            <p className="text-[28px] font-bold text-plum">{data.growth.guestsLast7d}</p>
          </div>
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">New Tasks (7d)</p>
            <p className="text-[28px] font-bold text-plum">{data.growth.tasksLast7d}</p>
          </div>
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">Chat Messages</p>
            <p className="text-[28px] font-bold text-plum">{data.growth.chatMessagesLast7d}</p>
            <p className="text-[11px] text-muted mt-1">
              {data.growth.chatMessagesLast30d} in last 30d
            </p>
          </div>
        </div>
      </div>

      {/* Soft-Deleted Records (Bloat) */}
      <div className="card p-6">
        <h2 className="text-[15px] font-semibold text-plum mb-4">Soft-Deleted Records (Bloat)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-[13px] font-semibold text-muted">Table</th>
                <th className="text-right py-2 px-3 text-[13px] font-semibold text-muted">Deleted Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.softDeleted).map(([table, count]) => (
                <tr key={table} className="border-b border-border/50">
                  <td className="py-2 px-3 text-plum">{table}</td>
                  <td
                    className={`py-2 px-3 text-right font-semibold ${
                      count > 0 ? "text-amber-600" : "text-muted"
                    }`}
                  >
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-muted mt-3">
          Soft-deleted records are kept for 30 days then permanently removed during sunset. High
          counts may indicate cleanup needed.
        </p>
      </div>

      {/* Backup Monitor */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-plum">Backup Monitor</h2>
          <button
            onClick={handleManualBackup}
            disabled={triggeringBackup}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {triggeringBackup ? "Running Backup..." : "Run Manual Backup"}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">Last Backup</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  data.backup.lastBackupStatus === "success"
                    ? "bg-green-100 text-green-700"
                    : data.backup.lastBackupStatus === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {data.backup.lastBackupStatus
                  ? data.backup.lastBackupStatus.charAt(0).toUpperCase() +
                    data.backup.lastBackupStatus.slice(1)
                  : "None"}
              </span>
            </div>
            {data.backup.lastBackupAt && (
              <p className="text-[11px] text-muted mt-2">
                {new Date(data.backup.lastBackupAt).toLocaleString()}
              </p>
            )}
            {data.backup.lastBackupDuration != null && (
              <p className="text-[11px] text-muted">
                Duration: {(data.backup.lastBackupDuration / 1000).toFixed(1)}s
              </p>
            )}
          </div>
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">Backups (Last 7d)</p>
            <p className="text-[28px] font-bold text-plum">{data.backup.backupsLast7d}</p>
          </div>
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">Errors (Last 7d)</p>
            <p
              className={`text-[28px] font-bold ${
                data.backup.backupErrorsLast7d > 0 ? "text-red-600" : "text-plum"
              }`}
            >
              {data.backup.backupErrorsLast7d}
            </p>
          </div>
          <div className="rounded-[12px] border border-border bg-white p-4">
            <p className="text-[13px] text-muted">SFTP Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  data.backup.sftpConfigured ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-[15px] font-semibold text-plum">
                {data.backup.sftpConfigured ? "Configured" : "Not Configured"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
