"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip } from "@/components/Tooltip";
import { trackCollaboratorInvited, trackExport } from "@/lib/analytics";

type Collaborator = {
  id: string;
  email: string;
  role: "partner" | "coordinator";
  invite_status: "pending" | "accepted";
  created_at: string;
};

type TrashItem = {
  type: string;
  id: string;
  name: string;
  deletedAt: string;
};

type ActivityEntry = {
  id: string;
  action: "create" | "update" | "delete" | "restore";
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
};

function actionIcon(action: string) {
  switch (action) {
    case "create":
      return "+";
    case "update":
      return "~";
    case "delete":
      return "x";
    case "restore":
      return "<-";
    default:
      return "?";
  }
}

function actionColor(action: string) {
  switch (action) {
    case "create":
      return "bg-confirmed-bg text-confirmed-text";
    case "delete":
      return "bg-red-100 text-red-700";
    case "restore":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-pending-bg text-pending-text";
  }
}

function formatEntityType(type: string) {
  return type.replace(/_/g, " ");
}

export default function SettingsPage() {
  const [emailReminders, setEmailReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [keyDecisions, setKeyDecisions] = useState("");

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"partner" | "coordinator">("partner");
  const [inviting, setInviting] = useState(false);

  // Trash
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(true);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Export
  const [exporting, setExporting] = useState(false);

  const fetchTrash = useCallback(() => {
    setTrashLoading(true);
    fetch("/api/trash")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTrashItems(data))
      .catch(() => setTrashItems([]))
      .finally(() => setTrashLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/weddings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((wedding) => {
        setWeddingId(wedding.id);
        setKeyDecisions(wedding.key_decisions || "");
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

    // Fetch collaborators (will 403 if not owner — that's fine)
    fetch("/api/collaborators")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setCollaborators(data);
          setIsOwner(true);
        }
      })
      .catch(() => {});

    // Fetch trash
    fetchTrash();

    // Fetch activity log
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setActivityLog(data))
      .catch(() => setActivityLog([]))
      .finally(() => setActivityLoading(false));
  }, [fetchTrash]);

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

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.status === 409) {
        toast.error("This person has already been invited");
        return;
      }
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setCollaborators((prev) => [...prev, saved]);
      setInviteEmail("");
      trackCollaboratorInvited();
      toast.success(`Invitation sent to ${saved.email}`);
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id: string) {
    const prev = collaborators;
    setCollaborators((c) => c.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/collaborators/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Collaborator removed");
    } catch {
      setCollaborators(prev);
      toast.error("Failed to remove collaborator");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedding-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      trackExport("json");
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  }

  async function handleRestore(item: TrashItem) {
    setRestoringIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: item.type, entityId: item.id }),
      });
      if (!res.ok) throw new Error();
      setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
      toast.success(`Restored ${formatEntityType(item.type)}: ${item.name}`);
    } catch {
      toast.error("Failed to restore item");
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  if (loading) {
    return <SkeletonList count={3} />;
  }

  return (
    <div className="max-w-lg">
      <h1>Settings</h1>
      <p className="mt-1 text-[15px] text-muted">
        Manage your notification preferences
      </p>

      <div className="mt-6">
        <Link
          href="/dashboard/onboarding"
          className="inline-flex items-center gap-2 text-[15px] text-violet hover:text-plum transition font-semibold"
        >
          Review Questionnaire Answers
          <span aria-hidden="true">&rarr;</span>
        </Link>
        <p className="mt-1 text-[12px] text-muted">
          Go back through the onboarding questions to update your wedding details
        </p>
      </div>

      {/* Things eydn should know */}
      <div className="mt-6">
        <h2 className="text-[18px] font-semibold text-plum">Things Eydn should know <Tooltip text="Anything you write here is included as context every time you chat with Eydn. Use it to store key decisions so you don't have to repeat yourself." wide /></h2>
        <p className="mt-1 text-[12px] text-muted">
          Key decisions and preferences that Eydn will remember across all conversations. Add anything important — theme, allergies, must-haves, cultural traditions, etc.
        </p>
        <textarea
          value={keyDecisions}
          aria-label="Things Eydn should know"
          onChange={(e) => setKeyDecisions(e.target.value)}
          onBlur={async () => {
            if (!weddingId) return;
            try {
              const res = await fetch(`/api/weddings/${weddingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key_decisions: keyDecisions || null }),
              });
              if (!res.ok) throw new Error();
              toast.success("Saved — Eydn will remember this");
            } catch {
              toast.error("Failed to save");
            }
          }}
          placeholder={"e.g.\n• We're going rustic-elegant with a woodland theme\n• No shellfish — groom has an allergy\n• Ceremony will be outdoors rain or shine\n• Colors are blush, sage, and gold\n• We want a first look before the ceremony\n• Budget priority: photography > food > flowers"}
          rows={6}
          className="mt-3 w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
        />
      </div>

      {/* Theme */}
      <div className="mt-8">
        <h2 className="text-[18px] font-semibold text-plum">Theme</h2>
        <p className="mt-1 text-[12px] text-muted">
          Choose between light and dark appearance
        </p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </div>

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
            Remind me before deadline <Tooltip text="You'll receive an email notification this many days before each task's due date, so you have time to complete it." wide />
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

      {/* Collaborators */}
      {isOwner && (
        <div className="mt-10">
          <h2 className="text-[18px] font-semibold text-plum">Collaborators <Tooltip text="Partner: full access to view, edit, and manage everything. Coordinator: can view and edit tasks, vendors, and guests, but cannot delete the wedding or manage billing." wide /></h2>
          <p className="mt-1 text-[12px] text-muted">
            Invite your partner or a wedding coordinator to share access to your wedding
          </p>

          {/* Invite form */}
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              aria-label="Collaborator email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
            <select
              value={inviteRole}
              aria-label="Collaborator role"
              onChange={(e) => setInviteRole(e.target.value as "partner" | "coordinator")}
              className="rounded-[10px] border-border px-3 py-2 text-[15px]"
            >
              <option value="partner">Partner</option>
              <option value="coordinator">Coordinator</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </div>

          {/* Collaborator list */}
          {collaborators.length > 0 && (
            <div className="mt-4 space-y-2">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-[10px] border border-border bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold text-white ${
                        c.role === "partner" ? "bg-violet" : "bg-soft-violet"
                      }`}
                    >
                      {c.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-plum">{c.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-muted capitalize">{c.role}</span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            c.invite_status === "accepted"
                              ? "bg-confirmed-bg text-confirmed-text"
                              : "bg-pending-bg text-pending-text"
                          }`}
                        >
                          {c.invite_status === "accepted" ? "Active" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="text-[12px] text-error hover:opacity-80 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {collaborators.length === 0 && (
            <p className="mt-4 text-[13px] text-muted">
              No collaborators yet. Invite your partner or coordinator above.
            </p>
          )}

          <p className="mt-3 text-[12px] text-muted">
            When your collaborator signs up or signs in with the invited email, they will automatically get access to your wedding.
          </p>
        </div>
      )}

      {/* Your Data */}
      <div className="mt-10">
        <h2 className="text-[18px] font-semibold text-plum">Your Data <Tooltip text="Downloads a JSON file containing all your wedding data: guests, tasks, vendors, budget, seating charts, timeline, and settings." wide /></h2>
        <p className="mt-1 text-[12px] text-muted">
          Download a complete backup of all your wedding planning data
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 btn-primary disabled:opacity-50"
        >
          {exporting ? "Preparing download..." : "Download My Data"}
        </button>
      </div>

      {/* Recently Deleted */}
      <div className="mt-10">
        <h2 className="text-[18px] font-semibold text-plum">Recently Deleted</h2>
        <p className="mt-1 text-[12px] text-muted">
          Items are permanently removed after 30 days
        </p>

        {trashLoading ? (
          <div className="mt-4">
            <SkeletonList count={2} />
          </div>
        ) : trashItems.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted">
            No recently deleted items.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {trashItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between rounded-[10px] border border-border bg-white px-4 py-3"
              >
                <div>
                  <p className="text-[15px] font-semibold text-plum">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] text-muted capitalize">
                      {formatEntityType(item.type)}
                    </span>
                    <span className="text-[12px] text-muted">
                      Deleted{" "}
                      {new Date(item.deletedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(item)}
                  disabled={restoringIds.has(item.id)}
                  className="text-[12px] text-violet hover:text-plum transition font-semibold disabled:opacity-50"
                >
                  {restoringIds.has(item.id) ? "Restoring..." : "Restore"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="mt-10 mb-10">
        <h2 className="text-[18px] font-semibold text-plum">Activity Log</h2>
        <p className="mt-1 text-[12px] text-muted">
          Recent changes to your wedding data
        </p>

        {activityLoading ? (
          <div className="mt-4">
            <SkeletonList count={3} />
          </div>
        ) : activityLog.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted">
            No activity recorded yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {activityLog.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-[10px] border border-border bg-white px-4 py-3"
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0 ${actionColor(entry.action)}`}
                >
                  {actionIcon(entry.action)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-plum">
                    <span className="capitalize font-semibold">
                      {entry.action}d
                    </span>{" "}
                    {formatEntityType(entry.entity_type)}
                    {entry.entity_name ? (
                      <>
                        {" "}
                        <span className="font-semibold">
                          {entry.entity_name}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-[12px] text-muted mt-0.5">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
