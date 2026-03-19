"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  job_assignment: string | null;
  sort_order: number;
};

const ROLES = [
  "Maid of Honor",
  "Best Man",
  "Bridesmaid",
  "Groomsman",
  "Flower Girl",
  "Ring Bearer",
  "Usher",
  "Other",
];

export default function WeddingPartyPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Bridesmaid");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wedding-party")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMembers)
      .catch(() => toast.error("Failed to load wedding party"))
      .finally(() => setLoading(false));
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const tempId = crypto.randomUUID();
    const member: Member = {
      id: tempId,
      name: name.trim(),
      role,
      email: null,
      phone: null,
      job_assignment: null,
      sort_order: members.length,
    };

    setMembers((prev) => [...prev, member]);
    setName("");
    setShowAdd(false);

    try {
      const res = await fetch("/api/wedding-party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: member.name, role: member.role, sort_order: member.sort_order }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      toast.success("Added to wedding party");
    } catch {
      setMembers((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Failed to add member");
    }
  }

  async function updateField(id: string, field: string, value: string | null) {
    const prev = members;
    setMembers((m) =>
      m.map((x) => (x.id === id ? { ...x, [field]: value } : x))
    );

    try {
      const res = await fetch(`/api/wedding-party/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMembers(prev);
      toast.error("Failed to update");
    }
  }

  async function deleteMember(id: string) {
    const prev = members;
    setMembers((m) => m.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/wedding-party/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Removed from wedding party");
    } catch {
      setMembers(prev);
      toast.error("Failed to remove");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-8">Loading...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wedding Party</h1>
          <p className="mt-1 text-sm text-gray-500">{members.length} members</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Add Member
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addMember} className="mt-4 flex gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm flex-1"
            required
            autoFocus
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition"
          >
            Add
          </button>
        </form>
      )}

      <div className="mt-6 space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border bg-white overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  {member.name}
                </span>
                <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                  {member.role}
                </span>
              </div>
              <button
                onClick={() => setEditing(editing === member.id ? null : member.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {editing === member.id ? "Close" : "Edit"}
              </button>
              <button
                onClick={() => deleteMember(member.id)}
                className="text-xs text-red-500 hover:text-red-400"
              >
                Remove
              </button>
            </div>

            {editing === member.id && (
              <div className="border-t px-4 py-3 grid gap-3 sm:grid-cols-2 bg-gray-50">
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <input
                    type="email"
                    defaultValue={member.email || ""}
                    onBlur={(e) =>
                      updateField(member.id, "email", e.target.value || null)
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Phone</label>
                  <input
                    type="tel"
                    defaultValue={member.phone || ""}
                    onBlur={(e) =>
                      updateField(member.id, "phone", e.target.value || null)
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500">
                    Day-of Job Assignment
                  </label>
                  <input
                    type="text"
                    defaultValue={member.job_assignment || ""}
                    onBlur={(e) =>
                      updateField(
                        member.id,
                        "job_assignment",
                        e.target.value || null
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm"
                    placeholder="e.g. Carry rings, hold bouquet during vows"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No wedding party members yet. Add someone to get started!
          </p>
        )}
      </div>
    </div>
  );
}
