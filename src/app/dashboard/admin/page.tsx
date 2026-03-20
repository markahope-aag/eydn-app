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

type Tab = "overview" | "subscribers" | "settings";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

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
        {(["overview", "subscribers", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${
              tab === t
                ? "border-violet text-violet"
                : "border-transparent text-muted hover:text-plum"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
