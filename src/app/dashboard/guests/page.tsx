"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

type Guest = {
  id: string;
  name: string;
  email: string | null;
  rsvp_status: "pending" | "accepted" | "declined";
  meal_preference: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  group_name: string | null;
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
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
      rsvp_status: "pending",
      meal_preference: null,
      plus_one: false,
      plus_one_name: null,
      group_name: null,
    };

    setGuests((prev) => [...prev, newGuest]);
    setName("");
    setEmail("");

    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGuest.name, email: newGuest.email }),
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

      // Reload guests
      const reload = await fetch("/api/guests");
      if (reload.ok) setGuests(await reload.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading guests...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Guest List</h1>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv"
            onChange={importCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="btn-ghost text-[13px]"
          >
            Import CSV
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-4">
        <span className="text-[15px] text-muted">
          Total: <strong className="font-semibold">{guests.length}</strong>
        </span>
        <span className="badge badge-confirmed">
          Accepted: <strong className="font-semibold">{accepted}</strong>
        </span>
        <span className="badge badge-declined">
          Declined: <strong className="font-semibold">{declined}</strong>
        </span>
        <span className="badge badge-pending">
          Pending: <strong className="font-semibold">{pending}</strong>
        </span>
      </div>

      <form onSubmit={addGuest} className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Guest name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
          required
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add Guest
        </button>
      </form>

      {guests.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-[16px] border-border bg-white">
          <table className="w-full text-[15px]">
            <thead className="border-b border-border bg-lavender">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">RSVP</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Meal</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Plus One</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Group</th>
                <th className="px-4 py-3 text-right font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="px-4 py-3 font-semibold text-plum">
                    {guest.name}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {guest.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={guest.rsvp_status}
                      onChange={(e) =>
                        updateGuest(guest.id, "rsvp_status", e.target.value)
                      }
                      className="rounded-[10px] border-border px-2 py-1 text-[15px]"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={guest.meal_preference || ""}
                      onBlur={(e) =>
                        updateGuest(
                          guest.id,
                          "meal_preference",
                          e.target.value || null
                        )
                      }
                      placeholder="—"
                      className="w-24 rounded-[10px] border-border px-2 py-1 text-[15px]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={guest.plus_one_name || ""}
                      onBlur={(e) =>
                        updateGuest(
                          guest.id,
                          "plus_one_name",
                          e.target.value || null
                        )
                      }
                      placeholder="—"
                      className="w-24 rounded-[10px] border-border px-2 py-1 text-[15px]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={guest.group_name || ""}
                      onBlur={(e) =>
                        updateGuest(
                          guest.id,
                          "group_name",
                          e.target.value || null
                        )
                      }
                      placeholder="—"
                      className="w-24 rounded-[10px] border-border px-2 py-1 text-[15px]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeGuest(guest.id)}
                      className="text-[15px] text-error hover:opacity-80"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
