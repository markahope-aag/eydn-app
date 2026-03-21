"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Stats = {
  total_subscribers: number;
  new_signups_7d: number;
  active_users_7d: number;
  total_events: number;
  onboarding_completed: number;
  conversion_rate: number;
  total_ai_chats: number;
};

type User = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  has_event: boolean;
  joined: number;
  last_sign_in: number | null;
};

type AppSettings = {
  registration: { enabled: boolean; invite_only: boolean };
  features: {
    ai_chat: boolean;
    seating_chart: boolean;
    day_of_planner: boolean;
    file_uploads: boolean;
  };
  limits: {
    max_guests: number;
    max_chat_messages_per_hour: number;
    max_file_size_mb: number;
  };
};

const DEFAULT_SETTINGS: AppSettings = {
  registration: { enabled: true, invite_only: false },
  features: { ai_chat: true, seating_chart: true, day_of_planner: true, file_uploads: true },
  limits: { max_guests: 500, max_chat_messages_per_hour: 30, max_file_size_mb: 10 },
};

type CronJobInfo = {
  name: string;
  schedule: string;
  description: string;
  stats: {
    lastRun: string | null;
    lastStatus: string | null;
    lastDuration: number | null;
    successCount: number;
    errorCount: number;
  };
};

type CronExecution = {
  id: string;
  job_name: string;
  status: "success" | "error";
  duration_ms: number | null;
  details: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
};

type CronData = {
  jobs: CronJobInfo[];
  recentExecutions: CronExecution[];
};

type BackupInfo = {
  dataStats: Record<string, number>;
  softDeleted: Record<string, number>;
  security: {
    rlsEnabled: boolean;
    protectedTables: string[];
    rateLimiting: boolean;
    securityHeaders: boolean;
    inputValidation: boolean;
    softDeletes: boolean;
    auditLogging: boolean;
    activityLogEntries: number;
  };
  backup: {
    sftpConfigured: boolean;
    sftpHost: string | null;
    sftpPath: string;
    cronSchedule: string;
    supabasePlan: string;
    supabasePITR: boolean;
    supabaseRetention: string;
  };
  recentActivity: Array<{
    action: string;
    entity_type: string;
    entity_name: string | null;
    user_id: string;
    created_at: string;
  }>;
};

type EmailData = {
  config: { resendConfigured: boolean; fromEmail: string };
  emailTypes: Array<{ type: string; label: string; trigger: string; sent: number }>;
  recentEmails: Array<{ email_type: string; wedding_id: string; sent_at: string }>;
  totalSent: number;
};

type Tab = "overview" | "subscribers" | "settings" | "data-security" | "cron-jobs" | "email";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [cronData, setCronData] = useState<CronData | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailType, setTestEmailType] = useState("post_wedding_welcome");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : DEFAULT_SETTINGS)),
    ])
      .then(([s, u, st]) => {
        if (s) setStats(s);
        setUsers(u || []);
        setSettings({ ...DEFAULT_SETTINGS, ...st });
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
      <div className="flex items-center justify-between">
        <h1>Platform Admin</h1>
        <a href="/dashboard/admin/vendors" className="btn-secondary">
          Vendor Directory
        </a>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-border">
        {(["overview", "subscribers", "settings", "data-security", "cron-jobs", "email"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${
              tab === t
                ? "border-violet text-violet"
                : "border-transparent text-muted hover:text-plum"
            }`}
          >
            {t === "data-security" ? "Data & Security" : t === "cron-jobs" ? "Cron Jobs" : t === "email" ? "Email" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && stats && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Subscribers" value={stats.total_subscribers} />
            <StatCard label="New Signups (7d)" value={stats.new_signups_7d} />
            <StatCard label="Active Users (7d)" value={stats.active_users_7d} />
            <StatCard
              label="Conversion Rate"
              value={`${stats.conversion_rate}%`}
              subtitle="Signup → Event created"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Events" value={stats.total_events} />
            <StatCard label="Onboarding Completed" value={stats.onboarding_completed} />
            <StatCard label="AI Chat Messages" value={stats.total_ai_chats} />
          </div>
        </div>
      )}

      {/* Subscribers Tab */}
      {tab === "subscribers" && (
        <div className="mt-6">
          <p className="text-[15px] text-muted mb-4">
            {users.length} registered {users.length === 1 ? "subscriber" : "subscribers"}
          </p>
          {users.length === 0 ? (
            <p className="text-[15px] text-muted py-8 text-center">
              No subscribers yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-[16px] border-border bg-white">
              <table className="w-full text-[15px]">
                <thead className="border-b border-border bg-lavender">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Joined</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Last Active</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3 font-semibold text-plum">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-muted">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.has_event ? (
                          <span className="badge badge-confirmed">
                            Active
                          </span>
                        ) : (
                          <span className="badge badge-pending">
                            No event
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(user.joined).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {user.last_sign_in
                          ? new Date(user.last_sign_in).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.user_id, e.target.value)}
                          className={`rounded-full px-2 py-0.5 text-[12px] font-semibold border-0 ${
                            user.role === "admin"
                              ? "bg-lavender text-violet"
                              : "bg-lavender text-muted"
                          }`}
                        >
                          <option value="user">Subscriber</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Data & Security Tab */}
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

      {/* Cron Jobs Tab */}
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

      {/* Email Tab */}
      {tab === "email" && (
        <div className="mt-6 space-y-8">
          {/* Load data on tab open */}
          {!emailData && !emailLoading && (
            <button
              onClick={() => {
                setEmailLoading(true);
                fetch("/api/admin/email")
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data) => { if (data) setEmailData(data); })
                  .catch(() => toast.error("Failed to load email data"))
                  .finally(() => setEmailLoading(false));
              }}
              className="btn-primary"
            >
              Load Email Dashboard
            </button>
          )}
          {emailLoading && <p className="text-[15px] text-muted py-8">Loading email data...</p>}

          {emailData && (
            <>
              {/* Config Status */}
              <div>
                <h2 className="text-[18px] font-semibold text-plum">Email Configuration</h2>
                <div className="mt-3 flex gap-4">
                  <div className="card p-4 flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${emailData.config.resendConfigured ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className="text-[15px] font-semibold text-plum">
                        Resend {emailData.config.resendConfigured ? "Connected" : "Not Configured"}
                      </p>
                      <p className="text-[12px] text-muted">From: {emailData.config.fromEmail}</p>
                    </div>
                  </div>
                  <div className="card p-4">
                    <p className="text-[15px] font-semibold text-plum">{emailData.totalSent}</p>
                    <p className="text-[12px] text-muted">Lifecycle emails sent</p>
                  </div>
                </div>
              </div>

              {/* Send Test Email */}
              <div>
                <h2 className="text-[18px] font-semibold text-plum">Send Test Email</h2>
                <p className="mt-1 text-[13px] text-muted">Preview any email template by sending a test to yourself.</p>
                <div className="mt-3 flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[12px] font-semibold text-muted">Recipient</label>
                    <input
                      type="email"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      placeholder="your@email.com"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Template</label>
                    <select
                      value={testEmailType}
                      onChange={(e) => setTestEmailType(e.target.value)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                    >
                      {emailData.emailTypes.map((et) => (
                        <option key={et.type} value={et.type}>{et.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      if (!testEmailTo) { toast.error("Enter a recipient email"); return; }
                      setSendingTest(true);
                      try {
                        const res = await fetch("/api/admin/email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ to: testEmailTo, templateType: testEmailType }),
                        });
                        const data = await res.json();
                        if (data.success) toast.success("Test email sent!");
                        else toast.error(data.error || "Failed to send");
                      } catch { toast.error("Failed to send test email"); }
                      finally { setSendingTest(false); }
                    }}
                    disabled={sendingTest || !testEmailTo}
                    className="btn-primary disabled:opacity-50"
                  >
                    {sendingTest ? "Sending..." : "Send Test"}
                  </button>
                </div>
              </div>

              {/* Email Types & Stats */}
              <div>
                <h2 className="text-[18px] font-semibold text-plum">Email Templates</h2>
                <div className="mt-3 overflow-x-auto rounded-[16px] border border-border bg-white">
                  <table className="w-full text-[14px]">
                    <thead className="border-b border-border bg-lavender">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted">Template</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">Trigger</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {emailData.emailTypes.map((et) => (
                        <tr key={et.type}>
                          <td className="px-4 py-3 font-semibold text-plum">{et.label}</td>
                          <td className="px-4 py-3 text-muted">{et.trigger}</td>
                          <td className="px-4 py-3 text-right font-semibold text-plum">{et.sent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Sends */}
              <div>
                <h2 className="text-[18px] font-semibold text-plum">Recent Sends</h2>
                {emailData.recentEmails.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {emailData.recentEmails.map((e, i) => (
                      <div key={i} className="card-list flex items-center gap-3 px-4 py-2">
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-lavender text-violet">
                          {e.email_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[13px] text-muted flex-1 truncate">
                          Wedding: {e.wedding_id.slice(0, 8)}...
                        </span>
                        <span className="text-[12px] text-muted">
                          {new Date(e.sent_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] text-muted">No emails sent yet.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="mt-6 max-w-lg space-y-8">
          <div>
            <h2 className="text-[15px] font-semibold text-plum">Registration</h2>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.registration.enabled}
                  onChange={() => toggleRegistration("enabled")}
                  className="accent-violet"
                />
                <div>
                  <p className="text-[15px] text-plum">Allow new signups</p>
                  <p className="text-[12px] text-muted">
                    Disable to prevent new subscribers from registering
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.registration.invite_only}
                  onChange={() => toggleRegistration("invite_only")}
                  className="accent-violet"
                />
                <div>
                  <p className="text-[15px] text-plum">Invite only</p>
                  <p className="text-[12px] text-muted">
                    Only invited users can sign up
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-[15px] font-semibold text-plum">Feature Flags</h2>
            <div className="mt-3 space-y-3">
              {(
                Object.entries(settings.features) as [
                  keyof AppSettings["features"],
                  boolean,
                ][]
              ).map(([key, enabled]) => (
                <label key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleFeature(key)}
                    className="accent-violet"
                  />
                  <span className="text-[15px] text-plum">
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[15px] font-semibold text-plum">Limits</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[12px] text-muted">Max guests per event</label>
                <input
                  type="number"
                  defaultValue={settings.limits.max_guests}
                  onBlur={(e) => {
                    const updated = { ...settings.limits, max_guests: Number(e.target.value) };
                    setSettings((s) => ({ ...s, limits: updated }));
                    updateSetting("limits", updated);
                  }}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted">Max AI chat messages per hour</label>
                <input
                  type="number"
                  defaultValue={settings.limits.max_chat_messages_per_hour}
                  onBlur={(e) => {
                    const updated = { ...settings.limits, max_chat_messages_per_hour: Number(e.target.value) };
                    setSettings((s) => ({ ...s, limits: updated }));
                    updateSetting("limits", updated);
                  }}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted">Max file size (MB)</label>
                <input
                  type="number"
                  defaultValue={settings.limits.max_file_size_mb}
                  onBlur={(e) => {
                    const updated = { ...settings.limits, max_file_size_mb: Number(e.target.value) };
                    setSettings((s) => ({ ...s, limits: updated }));
                    updateSetting("limits", updated);
                  }}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CronJobsTab({
  cronData,
  cronLoading,
  onLoad,
}: {
  cronData: CronData | null;
  cronLoading: boolean;
  onLoad: () => void;
}) {
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
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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

function DataSecurityTab({
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
            <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Supabase</p>
            <p className="mt-1 text-[15px] font-semibold text-plum">{backup.supabasePlan} Plan</p>
            <p className="text-[13px] text-muted">PITR: {backup.supabasePITR ? "Enabled" : "Disabled"}</p>
            <p className="text-[13px] text-muted">Retention: {backup.supabaseRetention}</p>
          </div>
          <div className="card p-4">
            <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Off-Platform (SFTP)</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${backup.sftpConfigured ? "bg-green-500" : "bg-red-500"}`} />
              <p className="text-[15px] font-semibold text-plum">
                {backup.sftpConfigured ? "Connected" : "Not Configured"}
              </p>
            </div>
            {backup.sftpConfigured && (
              <>
                <p className="text-[13px] text-muted">Host: {backup.sftpHost}</p>
                <p className="text-[13px] text-muted">Path: {backup.sftpPath}</p>
              </>
            )}
            {!backup.sftpConfigured && (
              <p className="text-[12px] text-muted mt-1">
                Set BACKUP_SFTP_HOST, BACKUP_SFTP_USER, BACKUP_SFTP_PASSWORD env vars
              </p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Schedule</p>
            <p className="mt-1 text-[15px] font-semibold text-plum">{backup.cronSchedule}</p>
            <p className="text-[13px] text-muted">Full data export to Hetzner</p>
            <p className="text-[13px] text-muted">All weddings included</p>
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

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="card p-6">
      <p className="text-[15px] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-plum">{value}</p>
      {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
    </div>
  );
}
