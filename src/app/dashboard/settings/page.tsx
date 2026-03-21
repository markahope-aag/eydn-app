"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Collaborator = {
  id: string;
  email: string;
  role: "partner" | "coordinator";
  invite_status: "pending" | "accepted";
  created_at: string;
};

export default function SettingsPage() {
  const [emailReminders, setEmailReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [weddingId, setWeddingId] = useState<string | null>(null);

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"partner" | "coordinator">("partner");
  const [inviting, setInviting] = useState(false);

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

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
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

      {/* Collaborators */}
      {isOwner && (
        <div className="mt-10">
          <h2 className="text-[18px] font-semibold text-plum">Collaborators</h2>
          <p className="mt-1 text-[12px] text-muted">
            Invite your partner or a wedding coordinator to share access to your wedding
          </p>

          {/* Invite form */}
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              className="flex-1 rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
            <select
              value={inviteRole}
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
                              ? "bg-[#D6F5E3] text-[#2E7D4F]"
                              : "bg-[#FFF3CC] text-[#8A5200]"
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
    </div>
  );
}
