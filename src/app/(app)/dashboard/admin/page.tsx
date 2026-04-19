"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import OverviewTab from "./_components/OverviewTab";
import SubscribersTab from "./_components/SubscribersTab";
import CronJobsTab from "./_components/CronJobsTab";
import DataSecurityTab from "./_components/DataSecurityTab";
import EmailTab from "./_components/EmailTab";
import SettingsTab from "./_components/SettingsTab";
import type {
  Stats,
  User,
  AppSettings,
  CronData,
  BackupInfo,
  EmailData,
  AnalyticsData,
  Tab,
} from "./_components/types";
import { DEFAULT_SETTINGS } from "./_components/types";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [cronData, setCronData] = useState<CronData | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json().then((d: { users?: User[] }) => d.users || []) : [])),
      fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : DEFAULT_SETTINGS)),
      fetch("/api/admin/analytics").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, u, st, a]) => {
        if (s) setStats(s);
        setUsers(u || []);
        setSettings({ ...DEFAULT_SETTINGS, ...st });
        if (a) setAnalyticsData(a);
      })
      .catch(() => toast.error("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  async function updateRole(userId: string, role: string) {
    const prev = users;
    setUsers((u) =>
      u.map((x) => (x.user_id === userId ? { ...x, role } : x))
    );

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      });
      if (!res.ok) throw new Error();
      toast.success("Role updated");
    } catch {
      setUsers(prev);
      toast.error("Failed to update role");
    }
  }

  async function updateSetting(key: string, value: unknown) {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    }
  }

  function toggleFeature(feature: keyof AppSettings["features"]) {
    const updated = { ...settings.features, [feature]: !settings.features[feature] };
    setSettings((s) => ({ ...s, features: updated }));
    updateSetting("features", updated);
  }

  function toggleRegistration(field: keyof AppSettings["registration"]) {
    const updated = { ...settings.registration, [field]: !settings.registration[field] };
    setSettings((s) => ({ ...s, registration: updated }));
    updateSetting("registration", updated);
  }

  function handleUpdateLimit(limits: AppSettings["limits"]) {
    setSettings((s) => ({ ...s, limits }));
    updateSetting("limits", limits);
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (forbidden) {
    return (
      <div className="max-w-lg">
        <h1>Access Denied</h1>
        <p className="mt-2 text-[15px] text-muted">
          You don&apos;t have admin access. If you&apos;re the app owner and this is
          your first time, you need to set yourself up as admin.
        </p>
        <button
          onClick={async () => {
            const res = await fetch("/api/admin/setup", { method: "POST" });
            if (res.ok) {
              toast.success("You are now an admin! Reloading...");
              window.location.reload();
            } else {
              const data = await res.json();
              toast.error(data.error || "Failed to set up admin");
            }
          }}
          className="btn-primary mt-4"
        >
          Make Me Admin
        </button>
      </div>
    );
  }

  return (
    <div>
      {tab === "overview" && <h1>Overview</h1>}
      {tab === "subscribers" && <h1>Subscribers</h1>}
      {tab === "cron-jobs" && <h1>Cron Jobs</h1>}
      {tab === "email" && <h1>Communications</h1>}
      {tab === "data-security" && <h1>Data & Security</h1>}
      {tab === "settings" && <h1>Settings</h1>}

      {tab === "overview" && stats && (
        <OverviewTab stats={stats} analyticsData={analyticsData} />
      )}

      {tab === "subscribers" && (
        <SubscribersTab users={users} onUpdateRole={updateRole} />
      )}

      {tab === "data-security" && (
        <DataSecurityTab
          backupInfo={backupInfo}
          backupLoading={backupLoading}
          triggeringBackup={triggeringBackup}
          onLoad={() => {
            if (backupInfo) return;
            setBackupLoading(true);
            fetch("/api/admin/backups")
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => { if (data) setBackupInfo(data); })
              .catch(() => toast.error("Failed to load backup info"))
              .finally(() => setBackupLoading(false));
          }}
          onTriggerBackup={() => {
            setTriggeringBackup(true);
            fetch("/api/admin/backups", { method: "POST" })
              .then((r) => r.json())
              .then((data) => {
                if (data.success) {
                  toast.success(`Backup complete: ${data.weddings} weddings, ${Math.round(data.bytes / 1024)}KB${data.sftp ? " (uploaded via SFTP)" : ""}`);
                } else {
                  toast.error(data.error || "Backup failed");
                }
              })
              .catch(() => toast.error("Backup request failed"))
              .finally(() => setTriggeringBackup(false));
          }}
        />
      )}

      {tab === "cron-jobs" && (
        <CronJobsTab
          cronData={cronData}
          cronLoading={cronLoading}
          onLoad={() => {
            if (cronData) return;
            setCronLoading(true);
            fetch("/api/admin/cron")
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => { if (data) setCronData(data); })
              .catch(() => toast.error("Failed to load cron data"))
              .finally(() => setCronLoading(false));
          }}
        />
      )}

      {tab === "email" && (
        <EmailTab
          emailData={emailData}
          emailLoading={emailLoading}
          onLoad={() => {
            if (emailData || emailLoading) return;
            setEmailLoading(true);
            fetch("/api/admin/email")
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => { if (data) setEmailData(data); })
              .catch(() => toast.error("Failed to load communications data"))
              .finally(() => setEmailLoading(false));
          }}
        />
      )}

      {tab === "settings" && (
        <SettingsTab
          settings={settings}
          onToggleFeature={toggleFeature}
          onToggleRegistration={toggleRegistration}
          onUpdateLimit={handleUpdateLimit}
        />
      )}
    </div>
  );
}
