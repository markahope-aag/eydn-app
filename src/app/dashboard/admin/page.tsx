"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Stats = {
  weddings: number;
  guests: number;
  tasks: number;
  completed_tasks: number;
  vendors: number;
  expenses: number;
  chat_messages: number;
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

type Event = {
  id: string;
  user_id: string;
  name: string;
  date: string | null;
  venue: string | null;
  budget: number | null;
  spent: number;
  guests: number;
  tasks: number;
  completed_tasks: number;
  vendors: number;
  created_at: string;
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

type Tab = "overview" | "users" | "events" | "settings";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
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
      fetch("/api/admin/events").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : DEFAULT_SETTINGS)),
    ])
      .then(([s, u, e, st]) => {
        if (s) setStats(s);
        setUsers(u || []);
        setEvents(e || []);
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
    return <p className="text-sm text-gray-400 py-8">Loading...</p>;
  }

  if (forbidden) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-500">
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
          className="mt-4 rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Make Me Admin
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b">
        {(["overview", "users", "events", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={users.length} />
          <StatCard label="Events" value={stats.weddings} />
          <StatCard label="Total Guests" value={stats.guests} />
          <StatCard label="Total Tasks" value={stats.tasks} />
          <StatCard
            label="Task Completion"
            value={
              stats.tasks > 0
                ? `${Math.round((stats.completed_tasks / stats.tasks) * 100)}%`
                : "—"
            }
          />
          <StatCard label="Vendors Tracked" value={stats.vendors} />
          <StatCard label="Expenses Logged" value={stats.expenses} />
          <StatCard label="Chat Messages" value={stats.chat_messages} />
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-4">
            {users.length} registered {users.length === 1 ? "user" : "users"}
          </p>
          {users.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No users yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Last Sign In</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.has_event ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            No event
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(user.joined).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {user.last_sign_in
                          ? new Date(user.last_sign_in).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.user_id, e.target.value)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 ${
                            user.role === "admin"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <option value="user">User</option>
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

      {/* Events Tab */}
      {tab === "events" && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-4">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No events yet.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {event.name}
                      </h3>
                      <div className="mt-1 flex gap-3 text-xs text-gray-500">
                        {event.date && <span>Date: {event.date}</span>}
                        {event.venue && <span>Venue: {event.venue}</span>}
                        <span>Created: {new Date(event.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {event.budget && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="text-sm font-medium text-gray-900">
                          ${event.spent.toLocaleString()} / ${event.budget.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-4">
                    <MiniStat label="Guests" value={event.guests} />
                    <MiniStat
                      label="Tasks"
                      value={`${event.completed_tasks}/${event.tasks}`}
                    />
                    <MiniStat label="Vendors" value={event.vendors} />
                    {event.tasks > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{
                              width: `${Math.round((event.completed_tasks / event.tasks) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {Math.round((event.completed_tasks / event.tasks) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="mt-6 max-w-lg space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Registration</h2>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.registration.enabled}
                  onChange={() => toggleRegistration("enabled")}
                  className="accent-rose-600"
                />
                <div>
                  <p className="text-sm text-gray-900">Allow new signups</p>
                  <p className="text-xs text-gray-500">
                    Disable to prevent new users from registering
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.registration.invite_only}
                  onChange={() => toggleRegistration("invite_only")}
                  className="accent-rose-600"
                />
                <div>
                  <p className="text-sm text-gray-900">Invite only</p>
                  <p className="text-xs text-gray-500">
                    Only users with an invitation can sign up
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">Feature Flags</h2>
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
                    className="accent-rose-600"
                  />
                  <span className="text-sm text-gray-900">
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">Limits</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-gray-500">Max guests per event</label>
                <input
                  type="number"
                  defaultValue={settings.limits.max_guests}
                  onBlur={(e) => {
                    const updated = { ...settings.limits, max_guests: Number(e.target.value) };
                    setSettings((s) => ({ ...s, limits: updated }));
                    updateSetting("limits", updated);
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Max chat messages per hour</label>
                <input
                  type="number"
                  defaultValue={settings.limits.max_chat_messages_per_hour}
                  onBlur={(e) => {
                    const updated = { ...settings.limits, max_chat_messages_per_hour: Number(e.target.value) };
                    setSettings((s) => ({ ...s, limits: updated }));
                    updateSetting("limits", updated);
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Max file size (MB)</label>
                <input
                  type="number"
                  defaultValue={settings.limits.max_file_size_mb}
                  onBlur={(e) => {
                    const updated = { ...settings.limits, max_file_size_mb: Number(e.target.value) };
                    setSettings((s) => ({ ...s, limits: updated }));
                    updateSetting("limits", updated);
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
