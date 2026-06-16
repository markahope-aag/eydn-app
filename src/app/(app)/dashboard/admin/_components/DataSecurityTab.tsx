"use client";

import { useEffect } from "react";
import type { BackupInfo } from "./types";

export default function DataSecurityTab({
  backupInfo,
  backupLoading,
  triggeringBackup,
  onLoad,
  onTriggerBackup,
}: {
  backupInfo: BackupInfo | null;
  backupLoading: boolean;
  triggeringBackup: boolean;
  onLoad: () => void;
  onTriggerBackup: () => void;
}) {
  // Fire once on mount — onLoad is stable (defined in parent with useCallback or equivalent)
  useEffect(() => { onLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (backupLoading) {
    return <p className="text-[15px] text-muted py-8">Loading data &amp; security info...</p>;
  }

  if (!backupInfo) {
    return <p className="text-[15px] text-muted py-8">Unable to load backup information.</p>;
  }

  const { dataStats, softDeleted, security, backup, recentActivity } = backupInfo;
  const actionColors: Record<string, string> = {
    create: "bg-[#D6F5E3] text-[#2E7D4F]",
    update: "bg-[#FFF3CC] text-[#8A5200]",
    delete: "bg-red-100 text-red-700",
    restore: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="mt-6 space-y-8">
      {/* Backup Status */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-plum">Backup System</h2>
          <button
            onClick={onTriggerBackup}
            disabled={triggeringBackup}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {triggeringBackup ? "Running Backup..." : "Run Manual Backup"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-4">
            <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Off-Platform ({backup.provider})</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${backup.configured ? "bg-green-500" : "bg-red-500"}`} />
              <p className="text-[15px] font-semibold text-plum">
                {backup.configured ? "Connected" : "Not Configured"}
              </p>
            </div>
            {backup.configured ? (
              <>
                <p className="text-[13px] text-muted">Bucket: {backup.bucket}</p>
                <p className="text-[13px] text-muted">
                  {backup.dailyBackupCount} daily · {backup.sunsetBackupCount} archived
                </p>
                {backup.listError && (
                  <p className="text-[12px] text-red-600 mt-1">List error: {backup.listError}</p>
                )}
              </>
            ) : (
              <p className="text-[12px] text-muted mt-1">
                Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars
              </p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Latest Backup</p>
            {backup.latestBackupAt ? (
              <>
                <p className="mt-1 text-[15px] font-semibold text-plum">
                  {new Date(backup.latestBackupAt).toLocaleString()}
                </p>
                {backup.latestBackupBytes != null && (
                  <p className="text-[13px] text-muted">
                    {(backup.latestBackupBytes / 1024).toFixed(0)} KB
                  </p>
                )}
                {backup.lastRun && (
                  <p className={`text-[13px] ${backup.lastRun.status === "success" ? "text-muted" : "text-red-600"}`}>
                    Last run: {backup.lastRun.status}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[15px] font-semibold text-plum">No backup yet</p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Schedule</p>
            <p className="mt-1 text-[15px] font-semibold text-plum">{backup.cronSchedule}</p>
            <p className="text-[13px] text-muted">All weddings exported to R2</p>
            <p className="text-[13px] text-muted">Retention: {backup.retentionPolicy}</p>
          </div>
        </div>
      </div>

      {/* Data Overview */}
      <div>
        <h2 className="text-[18px] font-semibold text-plum">Data Overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(dataStats).map(([key, count]) => (
            <div key={key} className="card p-4 flex items-center justify-between">
              <p className="text-[14px] text-muted capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
              <p className="text-[18px] font-semibold text-plum">{count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Soft Deletes / Trash */}
      <div>
        <h2 className="text-[18px] font-semibold text-plum">Trash (Soft-Deleted Records)</h2>
        <p className="mt-1 text-[13px] text-muted">
          Deleted records are kept for 30 days. Users can restore from Settings &rarr; Recently Deleted.
        </p>
        <div className="mt-3 flex gap-4">
          {Object.entries(softDeleted).map(([key, count]) => (
            <div key={key} className="card p-3 flex items-center gap-3">
              <p className="text-[14px] text-muted capitalize">{key}</p>
              <span className={`text-[15px] font-semibold ${(count as number) > 0 ? "text-error" : "text-plum"}`}>
                {(count as number).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Posture */}
      <div>
        <h2 className="text-[18px] font-semibold text-plum">Security Posture</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Row Level Security (RLS)", enabled: security.rlsEnabled, detail: `${security.protectedTables.length} tables protected` },
            { label: "Rate Limiting", enabled: security.rateLimiting, detail: "Public APIs: 20/min, Chat: 10/min" },
            { label: "Security Headers", enabled: security.securityHeaders, detail: "HSTS, X-Frame-Options, CSP" },
            { label: "Input Validation", enabled: security.inputValidation, detail: "All POST/PATCH routes validated" },
            { label: "Soft Deletes", enabled: security.softDeletes, detail: "7 tables, 30-day retention" },
            { label: "Audit Logging", enabled: security.auditLogging, detail: `${security.activityLogEntries.toLocaleString()} entries recorded` },
          ].map((item) => (
            <div key={item.label} className="card p-4 flex items-start gap-3">
              <span className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${item.enabled ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <p className="text-[15px] font-semibold text-plum">{item.label}</p>
                <p className="text-[12px] text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-[18px] font-semibold text-plum">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="mt-3 space-y-1">
            {recentActivity.map((entry, i) => (
              <div key={i} className="card-list flex items-center gap-3 px-4 py-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${actionColors[entry.action] || "bg-lavender text-violet"}`}>
                  {entry.action}
                </span>
                <span className="text-[14px] text-plum flex-1">
                  {entry.entity_type}{entry.entity_name ? `: ${entry.entity_name}` : ""}
                </span>
                <span className="text-[12px] text-muted">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-muted">No activity recorded yet.</p>
        )}
      </div>
    </div>
  );
}
