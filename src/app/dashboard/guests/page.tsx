"use client";

import { useState } from "react";
import { toast } from "sonner";

type Guest = {
  id: string;
  name: string;
  email: string | null;
  rsvp_status: "pending" | "accepted" | "declined";
  meal_preference: string | null;
  plus_one: boolean;
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function addGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newGuest: Guest = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim() || null,
      rsvp_status: "pending",
      meal_preference: null,
      plus_one: false,
    };

    setGuests((prev) => [...prev, newGuest]);
    setName("");
    setEmail("");
    toast.success(`${newGuest.name} added to the guest list`);
  }

  function removeGuest(id: string) {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    toast("Guest removed");
  }

  function updateRsvp(id: string, status: Guest["rsvp_status"]) {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, rsvp_status: status } : g))
    );
  }

  const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Guest List</h1>

      <div className="mt-4 flex gap-4">
        <span className="text-sm text-gray-500">
          Total: <strong>{guests.length}</strong>
        </span>
        <span className="text-sm text-green-600">
          Accepted: <strong>{accepted}</strong>
        </span>
        <span className="text-sm text-red-600">
          Declined: <strong>{declined}</strong>
        </span>
        <span className="text-sm text-yellow-600">
          Pending: <strong>{pending}</strong>
        </span>
      </div>

      {/* Add guest form */}
      <form onSubmit={addGuest} className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Guest name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm flex-1"
          required
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm flex-1"
        />
        <button
          type="submit"
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Add Guest
        </button>
      </form>

      {/* Guest table */}
      {guests.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  RSVP
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {guest.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {guest.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={guest.rsvp_status}
                      onChange={(e) =>
                        updateRsvp(
                          guest.id,
                          e.target.value as Guest["rsvp_status"]
                        )
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeGuest(guest.id)}
                      className="text-sm text-red-600 hover:text-red-500"
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
