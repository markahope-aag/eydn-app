"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

type Guest = {
  id: string;
  name: string;
  email: string | null;
  rsvp_status: "not_invited" | "invite_sent" | "pending" | "accepted" | "declined";
  meal_preference: string | null;
  role: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  group_name: string | null;
};

const ROLES = ["family", "friend", "wedding_party", "coworker", "plus_one", "other"];
const ROLE_LABELS: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  wedding_party: "Wedding Party",
  coworker: "Coworker",
  plus_one: "Plus One",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  not_invited: "Not Invited",
  invite_sent: "Invite Sent",
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

const STATUS_BADGE: Record<string, string> = {
  not_invited: "bg-lavender text-muted",
  invite_sent: "badge-pending",
  pending: "badge-pending",
  accepted: "badge-confirmed",
  declined: "badge-declined",
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/guests")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setGuests)
      .catch(() => toast.error("Failed to load guests"))
      .finally(() => setLoading(false));
  }, []);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const tempId = crypto.randomUUID();
    const newGuest: Guest = {
      id: tempId,
      name: name.trim(),
      email: email.trim() || null,
      rsvp_status: "not_invited",
      meal_preference: null,
      role: "friend",
      plus_one: false,
      plus_one_name: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      group_name: null,
    };

    setGuests((prev) => [...prev, newGuest]);
    setName("");
    setEmail("");

    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGuest.name, email: newGuest.email, rsvp_status: "not_invited", role: "friend" }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setGuests((prev) => prev.map((g) => (g.id === tempId ? saved : g)));
      toast.success(`${newGuest.name} added to the guest list`);
    } catch {
      setGuests((prev) => prev.filter((g) => g.id !== tempId));
      toast.error("Failed to add guest");
    }
  }

  async function removeGuest(id: string) {
    const prev = guests;
    setGuests((g) => g.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Guest removed");
    } catch {
      setGuests(prev);
      toast.error("Failed to remove guest");
    }
  }

  async function updateGuest(id: string, field: string, value: string | boolean | null) {
    const prev = guests;
    setGuests((g) =>
      g.map((x) => (x.id === id ? { ...x, [field]: value } : x))
    );

    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setGuests(prev);
      toast.error("Failed to update guest");
    }
  }

  async function importCSV() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/guests/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const { imported } = await res.json();
      toast.success(`Imported ${imported} guests`);
      const reload = await fetch("/api/guests");
      if (reload.ok) setGuests(await reload.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const filtered = guests.filter((g) => {
    if (filterRole && g.role !== filterRole) return false;
    if (filterStatus && g.rsvp_status !== filterStatus) return false;
    return true;
  });

  const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const invited = guests.filter((g) => g.rsvp_status !== "not_invited").length;

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading guests...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Guest List</h1>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept=".csv" onChange={importCSV} className="hidden" />
          <button onClick={() => fileInput.current?.click()} className="btn-ghost btn-sm">
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4 flex-wrap">
        <span className="text-[15px] text-muted">Total: <strong className="font-semibold">{guests.length}</strong></span>
        <span className="text-[15px] text-muted">Invited: <strong className="font-semibold">{invited}</strong></span>
        <span className="badge badge-confirmed">Accepted: {accepted}</span>
        <span className="badge badge-declined">Declined: {declined}</span>
      </div>

      {/* Filters */}
      <div className="mt-4 flex gap-3">
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="rounded-[10px] border-border px-3 py-1.5 text-[15px]">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-[10px] border-border px-3 py-1.5 text-[15px]">
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Add guest */}
      <form onSubmit={addGuest} className="mt-6 flex gap-3">
        <input type="text" placeholder="Guest name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1" required />
        <input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1" />
        <button type="submit" className="btn-primary">Add Guest</button>
      </form>

      {/* Guest list */}
      {filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((guest) => (
            <div key={guest.id} className="card overflow-hidden">
              {/* Main row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-plum">{guest.name}</span>
                    {guest.role && (
                      <span className="badge">{ROLE_LABELS[guest.role] || guest.role}</span>
                    )}
                  </div>
                  {guest.email && <p className="text-[12px] text-muted truncate">{guest.email}</p>}
                </div>

                <select
                  value={guest.rsvp_status}
                  onChange={(e) => updateGuest(guest.id, "rsvp_status", e.target.value)}
                  className={`rounded-full px-2 py-0.5 text-[12px] font-semibold border-0 ${STATUS_BADGE[guest.rsvp_status] || ""}`}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>

                <button
                  onClick={() => setExpanded(expanded === guest.id ? null : guest.id)}
                  className="text-[12px] text-muted hover:text-plum"
                >
                  {expanded === guest.id ? "Close" : "Details"}
                </button>
                <button onClick={() => removeGuest(guest.id)} className="text-[12px] text-error hover:opacity-80">
                  Remove
                </button>
              </div>

              {/* Expanded details */}
              {expanded === guest.id && (
                <div className="border-t border-border px-4 py-3 bg-lavender/30 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-[12px] text-muted">Role</label>
                    <select
                      value={guest.role || "friend"}
                      onChange={(e) => updateGuest(guest.id, "role", e.target.value)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] text-muted">Meal Preference</label>
                    <input
                      type="text"
                      defaultValue={guest.meal_preference || ""}
                      onBlur={(e) => updateGuest(guest.id, "meal_preference", e.target.value || null)}
                      placeholder="e.g. Vegetarian"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted">Plus One Name</label>
                    <input
                      type="text"
                      defaultValue={guest.plus_one_name || ""}
                      onBlur={(e) => updateGuest(guest.id, "plus_one_name", e.target.value || null)}
                      placeholder="—"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted">Phone</label>
                    <input
                      type="tel"
                      defaultValue={guest.phone || ""}
                      onBlur={(e) => updateGuest(guest.id, "phone", e.target.value || null)}
                      placeholder="(555) 123-4567"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted">Group</label>
                    <input
                      type="text"
                      defaultValue={guest.group_name || ""}
                      onBlur={(e) => updateGuest(guest.id, "group_name", e.target.value || null)}
                      placeholder="e.g. Bride's family"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[12px] text-muted">Address</label>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        type="text"
                        defaultValue={guest.address_line1 || ""}
                        onBlur={(e) => updateGuest(guest.id, "address_line1", e.target.value || null)}
                        placeholder="Street address"
                        className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2"
                      />
                      <input
                        type="text"
                        defaultValue={guest.address_line2 || ""}
                        onBlur={(e) => updateGuest(guest.id, "address_line2", e.target.value || null)}
                        placeholder="Apt, suite, etc."
                        className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2"
                      />
                      <input
                        type="text"
                        defaultValue={guest.city || ""}
                        onBlur={(e) => updateGuest(guest.id, "city", e.target.value || null)}
                        placeholder="City"
                        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      />
                      <input
                        type="text"
                        defaultValue={guest.state || ""}
                        onBlur={(e) => updateGuest(guest.id, "state", e.target.value || null)}
                        placeholder="State"
                        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        defaultValue={guest.zip || ""}
                        onBlur={(e) => updateGuest(guest.id, "zip", e.target.value || null)}
                        placeholder="ZIP"
                        className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && guests.length > 0 && (
        <p className="text-[15px] text-muted text-center py-8">No guests match your filters.</p>
      )}
      {guests.length === 0 && (
        <p className="text-[15px] text-muted text-center py-8">No guests yet. Add one above to get started.</p>
      )}
    </div>
  );
}
