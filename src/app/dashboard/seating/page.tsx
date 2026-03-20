"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Table = {
  id: string;
  table_number: number;
  name: string | null;
  x: number;
  y: number;
  shape: "round" | "rectangle";
  capacity: number;
};

type Guest = {
  id: string;
  name: string;
  rsvp_status: string;
};

type Assignment = {
  id: string;
  seating_table_id: string;
  guest_id: string;
  seat_number: number | null;
};

export default function SeatingPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingGuest, setDraggingGuest] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/seating/tables").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/guests").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/seating/assignments").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([t, g, a]) => {
        setTables(t);
        setGuests(g);
        setAssignments(a);
      })
      .catch(() => toast.error("Failed to load seating data"))
      .finally(() => setLoading(false));
  }, []);

  async function addTable() {
    const nextNum = tables.length + 1;
    try {
      const res = await fetch("/api/seating/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: nextNum,
          name: `Table ${nextNum}`,
          x: 50 + (nextNum % 4) * 180,
          y: 50 + Math.floor((nextNum - 1) / 4) * 180,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setTables((prev) => [...prev, saved]);
      toast.success(`Table ${nextNum} added`);
    } catch {
      toast.error("Failed to add table");
    }
  }

  async function deleteTable(id: string) {
    const prev = tables;
    setTables((t) => t.filter((x) => x.id !== id));
    setAssignments((a) => a.filter((x) => x.seating_table_id !== id));

    try {
      const res = await fetch(`/api/seating/tables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Table removed");
    } catch {
      setTables(prev);
      toast.error("Failed to remove table");
    }
  }

  async function assignGuest(guestId: string, tableId: string) {
    // Optimistic
    const tempId = crypto.randomUUID();
    setAssignments((prev) => [
      ...prev.filter((a) => a.guest_id !== guestId),
      { id: tempId, seating_table_id: tableId, guest_id: guestId, seat_number: null },
    ]);

    try {
      const res = await fetch("/api/seating/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seating_table_id: tableId, guest_id: guestId }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setAssignments((prev) =>
        prev.map((a) => (a.id === tempId ? saved : a))
      );
    } catch {
      setAssignments((prev) => prev.filter((a) => a.id !== tempId));
      toast.error("Failed to assign guest");
    }
  }

  async function unassignGuest(guestId: string) {
    const prev = assignments;
    setAssignments((a) => a.filter((x) => x.guest_id !== guestId));

    try {
      const res = await fetch(
        `/api/seating/assignments?guest_id=${guestId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
    } catch {
      setAssignments(prev);
      toast.error("Failed to unassign guest");
    }
  }

  const assignedGuestIds = new Set(assignments.map((a) => a.guest_id));
  const unassignedGuests = guests.filter(
    (g) => !assignedGuestIds.has(g.id) && g.rsvp_status !== "declined"
  );

  function getTableGuests(tableId: string) {
    const guestIds = assignments
      .filter((a) => a.seating_table_id === tableId)
      .map((a) => a.guest_id);
    return guests.filter((g) => guestIds.includes(g.id));
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Canvas */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1>Seating Chart</h1>
          <button
            onClick={addTable}
            className="btn-primary"
          >
            Add Table
          </button>
        </div>

        <div
          className="relative bg-white rounded-[16px] border-border min-h-[500px] overflow-auto"
          onDragOver={(e) => e.preventDefault()}
        >
          {tables.map((table) => {
            const tableGuests = getTableGuests(table.id);
            const isFull = tableGuests.length >= table.capacity;

            return (
              <div
                key={table.id}
                className="absolute"
                style={{ left: table.x, top: table.y }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const guestId = e.dataTransfer.getData("text/plain");
                  if (guestId && !isFull) {
                    assignGuest(guestId, table.id);
                  }
                }}
              >
                <div
                  className={`w-36 border-2 bg-white shadow-sm p-3 ${
                    table.shape === "round" ? "rounded-full" : "rounded-[16px]"
                  } ${isFull ? "border-violet" : "border-border"}`}
                >
                  <div className="text-center">
                    <p className="text-[12px] font-semibold text-plum">
                      {table.name || `Table ${table.table_number}`}
                    </p>
                    <p className="text-[10px] text-muted">
                      {tableGuests.length}/{table.capacity}
                    </p>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {tableGuests.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between text-[10px]"
                      >
                        <span className="text-muted truncate">
                          {g.name}
                        </span>
                        <button
                          onClick={() => unassignGuest(g.id)}
                          className="text-error hover:opacity-80 ml-1"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteTable(table.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white rounded-full text-[10px] flex items-center justify-center hover:opacity-80"
                >
                  x
                </button>
              </div>
            );
          })}

          {tables.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <p className="text-[15px] text-muted">
                Add tables to start building your seating chart
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guest sidebar */}
      <div className="w-56 flex-shrink-0">
        <h2 className="text-[15px] font-semibold text-muted mb-2">
          Unassigned ({unassignedGuests.length})
        </h2>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {unassignedGuests.map((guest) => (
            <div
              key={guest.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", guest.id);
                setDraggingGuest(guest.id);
              }}
              onDragEnd={() => setDraggingGuest(null)}
              className={`rounded-[10px] border-border px-3 py-1.5 text-[15px] cursor-grab active:cursor-grabbing ${
                draggingGuest === guest.id
                  ? "border-violet bg-lavender"
                  : "bg-white hover:bg-lavender"
              }`}
            >
              {guest.name}
            </div>
          ))}
          {unassignedGuests.length === 0 && (
            <p className="text-[12px] text-muted">All guests assigned!</p>
          )}
        </div>
      </div>
    </div>
  );
}
