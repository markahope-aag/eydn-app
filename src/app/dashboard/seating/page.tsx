"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tooltip } from "@/components/Tooltip";

type Table = {
  id: string;
  table_number: number;
  name: string | null;
  x: number;
  y: number;
  shape: "round" | "rectangle";
  capacity: number;
};

type Guest = { id: string; name: string; rsvp_status: string };
type Assignment = { id: string; seating_table_id: string; guest_id: string; seat_number: number | null };
type WeddingPartyMember = { id: string; name: string; role: string };
type CeremonyPosition = {
  id: string;
  person_type: "wedding_party" | "officiant" | "couple";
  person_name: string;
  role: string | null;
  side: "left" | "right" | "center" | null;
  position_order: number;
};

type Tab = "reception" | "ceremony";

export default function SeatingPage() {
  const [tab, setTab] = useState<Tab>("reception");
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [partyMembers, setPartyMembers] = useState<WeddingPartyMember[]>([]);
  const [ceremonyPositions, setCeremonyPositions] = useState<CeremonyPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingGuest, setDraggingGuest] = useState<string | null>(null);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/seating/tables").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/guests").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/seating/assignments").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/wedding-party").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/ceremony").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([t, g, a, p, c]) => {
        setTables(t);
        setGuests(g);
        setAssignments(a);
        setPartyMembers(p);
        setCeremonyPositions(c);
      })
      .catch(() => toast.error("Failed to load seating data"))
      .finally(() => setLoading(false));
  }, []);

  // --- Table dragging ---
  const handleTableMouseDown = useCallback((e: React.MouseEvent, tableId: string, tableX: number, tableY: number) => {
    e.preventDefault();
    setDraggingTable(tableId);
    const rect = canvasRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left || 0) - tableX,
      y: e.clientY - (rect?.top || 0) - tableY,
    };
  }, []);

  useEffect(() => {
    if (!draggingTable) return;

    function onMouseMove(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = Math.max(0, e.clientX - rect.left - dragOffset.current.x);
      const newY = Math.max(0, e.clientY - rect.top - dragOffset.current.y);
      setTables((prev) =>
        prev.map((t) => (t.id === draggingTable ? { ...t, x: newX, y: newY } : t))
      );
    }

    function onMouseUp() {
      // Save final position
      setTables((prev) => {
        const table = prev.find((t) => t.id === draggingTable);
        if (table) {
          fetch(`/api/seating/tables/${table.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: table.x, y: table.y }),
          }).catch(() => {});
        }
        return prev;
      });
      setDraggingTable(null);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingTable]);

  // --- Reception functions ---
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
    } catch {
      toast.error("Failed to add table");
    }
  }

  async function deleteTable(id: string) {
    const prev = tables;
    setTables((t) => t.filter((x) => x.id !== id));
    setAssignments((a) => a.filter((x) => x.seating_table_id !== id));
    try {
      await fetch(`/api/seating/tables/${id}`, { method: "DELETE" });
    } catch {
      setTables(prev);
      toast.error("Failed to remove table");
    }
  }

  async function assignGuest(guestId: string, tableId: string) {
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
      setAssignments((prev) => prev.map((a) => (a.id === tempId ? saved : a)));
    } catch {
      setAssignments((prev) => prev.filter((a) => a.id !== tempId));
      toast.error("Failed to assign guest");
    }
  }

  async function unassignGuest(guestId: string) {
    const prev = assignments;
    setAssignments((a) => a.filter((x) => x.guest_id !== guestId));
    try {
      await fetch(`/api/seating/assignments?guest_id=${guestId}`, { method: "DELETE" });
    } catch {
      setAssignments(prev);
    }
  }

  // --- Ceremony functions ---
  async function addCeremonyPosition(personName: string, personType: "wedding_party" | "officiant" | "couple", side: "left" | "right" | "center", role?: string) {
    try {
      const res = await fetch("/api/ceremony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_name: personName,
          person_type: personType,
          side,
          role: role || null,
          position_order: ceremonyPositions.filter((p) => p.side === side).length,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setCeremonyPositions((prev) => [...prev, saved]);
    } catch {
      toast.error("Failed to add position");
    }
  }

  async function removeCeremonyPosition(id: string) {
    const prev = ceremonyPositions;
    setCeremonyPositions((p) => p.filter((x) => x.id !== id));
    try {
      await fetch(`/api/ceremony?id=${id}`, { method: "DELETE" });
    } catch {
      setCeremonyPositions(prev);
    }
  }

  const [editingTable, setEditingTable] = useState<string | null>(null);

  async function updateTable(id: string, updates: Partial<Table>) {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    try {
      await fetch(`/api/seating/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {
      toast.error("Failed to update table");
    }
  }

  const assignedGuestIds = new Set(assignments.map((a) => a.guest_id));
  const unassignedGuests = guests.filter((g) => !assignedGuestIds.has(g.id) && g.rsvp_status !== "declined");

  function getTableGuests(tableId: string) {
    const guestIds = assignments.filter((a) => a.seating_table_id === tableId).map((a) => a.guest_id);
    return guests.filter((g) => guestIds.includes(g.id));
  }

  const leftSide = ceremonyPositions.filter((p) => p.side === "left");
  const rightSide = ceremonyPositions.filter((p) => p.side === "right");
  const centerPositions = ceremonyPositions.filter((p) => p.side === "center");
  const assignedPartyNames = new Set(ceremonyPositions.map((p) => p.person_name));
  const availableParty = partyMembers.filter((m) => !assignedPartyNames.has(m.name));

  if (loading) return <SkeletonList count={4} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Seating Chart</h1>
        <div className="flex gap-1">
          <button
            role="tab"
            aria-selected={tab === "reception"}
            onClick={() => setTab("reception")}
            className={`px-4 py-2 text-[15px] font-semibold rounded-full transition ${tab === "reception" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
          >
            Reception
          </button>
          <button
            role="tab"
            aria-selected={tab === "ceremony"}
            onClick={() => setTab("ceremony")}
            className={`px-4 py-2 text-[15px] font-semibold rounded-full transition ${tab === "ceremony" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
          >
            Ceremony
          </button>
        </div>
      </div>

      {/* RECEPTION TAB */}
      {tab === "reception" && (
        <div className="flex gap-6 h-[calc(100vh-10rem)]">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] text-muted">Drag tables to reposition. Drag guests onto tables. Click <strong>Edit</strong> on any table to change its size, shape, or name.</p>
              <button onClick={addTable} className="btn-primary btn-sm">Add Table</button>
            </div>

            <div
              ref={canvasRef}
              className="relative bg-white rounded-[16px] border border-border flex-1 overflow-auto"
              style={{ minHeight: 500 }}
              onDragOver={(e) => e.preventDefault()}
            >
              {tables.map((table) => {
                const tableGuests = getTableGuests(table.id);
                const isFull = tableGuests.length >= table.capacity;

                return (
                  <div
                    key={table.id}
                    className="absolute select-none"
                    style={{ left: table.x, top: table.y, cursor: draggingTable === table.id ? "grabbing" : "grab" }}
                    onMouseDown={(e) => handleTableMouseDown(e, table.id, table.x, table.y)}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const guestId = e.dataTransfer.getData("text/plain");
                      if (guestId && !isFull) assignGuest(guestId, table.id);
                    }}
                  >
                    <div className={`${table.shape === "round" ? "w-36 rounded-full" : "w-44 rounded-[16px]"} border-2 bg-white shadow-sm p-3 ${isFull ? "border-violet" : "border-border"}`}>
                      <div className="text-center">
                        <p className="text-[12px] font-semibold text-plum">
                          {table.name || `Table ${table.table_number}`}
                        </p>
                        <p className="text-[10px] text-muted">
                          {tableGuests.length}/{table.capacity} &middot; {table.shape}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === table.id ? null : table.id); }}
                          className={`mt-1 text-[11px] font-semibold px-3 py-1 rounded-full transition min-h-6 ${
                            editingTable === table.id
                              ? "bg-violet text-white"
                              : "bg-lavender text-violet hover:bg-violet hover:text-white"
                          }`}
                        >
                          {editingTable === table.id ? "Close" : "Edit"}
                        </button>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {tableGuests.map((g) => (
                          <div key={g.id} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted truncate">{g.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); unassignGuest(g.id); }} aria-label={`Remove guest ${g.name} from table`} className="w-5 h-5 flex items-center justify-center text-error hover:opacity-80 ml-1 text-[10px]">x</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edit popover */}
                    {editingTable === table.id && (
                      <div
                        className="absolute top-full left-0 mt-1 z-10 bg-white border border-border rounded-[12px] shadow-lg p-3 space-y-3 w-52"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="text-[11px] font-semibold text-muted">Table Name</label>
                          <input
                            type="text"
                            value={table.name || ""}
                            onChange={(e) => updateTable(table.id, { name: e.target.value })}
                            className="mt-0.5 w-full rounded-[8px] border-border px-2 py-1 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted">Shape <Tooltip text="Round tables seat guests evenly around the perimeter. Rectangle tables seat more guests but can make cross-table conversation harder." wide /></label>
                          <div className="flex gap-1 mt-0.5">
                            <button
                              onClick={() => updateTable(table.id, { shape: "round" })}
                              className={`flex-1 px-2 py-1 text-[12px] font-semibold rounded-[8px] transition ${table.shape === "round" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
                            >
                              Round
                            </button>
                            <button
                              onClick={() => updateTable(table.id, { shape: "rectangle" })}
                              className={`flex-1 px-2 py-1 text-[12px] font-semibold rounded-[8px] transition ${table.shape === "rectangle" ? "bg-violet text-white" : "bg-lavender text-violet"}`}
                            >
                              Rectangle
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted">Seats</label>
                          <div className="flex items-center gap-2 mt-0.5">
                            <button
                              onClick={() => updateTable(table.id, { capacity: Math.max(1, table.capacity - 1) })}
                              disabled={table.capacity <= 1}
                              aria-label="Decrease capacity"
                              className="w-7 h-7 rounded-full bg-lavender text-violet font-semibold text-[14px] flex items-center justify-center hover:bg-violet hover:text-white transition disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="text-[15px] font-semibold text-plum w-6 text-center">{table.capacity}</span>
                            <button
                              onClick={() => updateTable(table.id, { capacity: table.capacity + 1 })}
                              aria-label="Increase capacity"
                              className="w-7 h-7 rounded-full bg-lavender text-violet font-semibold text-[14px] flex items-center justify-center hover:bg-violet hover:text-white transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingTable(null)}
                          className="w-full text-[12px] text-muted hover:text-plum transition text-center"
                        >
                          Done
                        </button>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteTable(table.id); }}
                      aria-label={`Delete ${table.name || `Table ${table.table_number}`}`}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full text-[12px] flex items-center justify-center hover:opacity-80"
                    >
                      x
                    </button>
                  </div>
                );
              })}

              {tables.length === 0 && (
                <div className="flex items-center justify-center h-64">
                  <p className="text-[15px] text-muted">Add tables to start building your seating chart</p>
                </div>
              )}
            </div>
          </div>

          {/* Guest sidebar */}
          <div className="w-56 flex-shrink-0">
            <h2 className="text-[15px] font-semibold text-muted mb-2">Unassigned ({unassignedGuests.length}) <Tooltip text="Drag a guest name and drop it onto a table to assign their seat." /></h2>
            <div className="space-y-1 max-h-[500px] overflow-y-auto" aria-label="Unassigned guests — drag to a table or use the dropdown to assign">
              {unassignedGuests.map((guest) => (
                <div
                  key={guest.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", guest.id); setDraggingGuest(guest.id); }}
                  onDragEnd={() => setDraggingGuest(null)}
                  className={`rounded-[10px] border border-border px-3 py-1.5 text-[13px] flex items-center gap-1 cursor-grab active:cursor-grabbing ${draggingGuest === guest.id ? "border-violet bg-lavender" : "bg-white hover:bg-lavender"}`}
                >
                  <span className="flex-1 truncate">{guest.name}</span>
                  <select
                    aria-label={`Assign ${guest.name} to table`}
                    value=""
                    onChange={(e) => { if (e.target.value) assignGuest(guest.id, e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-[11px] text-violet bg-transparent border-0 cursor-pointer p-0 min-h-6"
                  >
                    <option value="">Table...</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || `Table ${t.table_number}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {unassignedGuests.length === 0 && <p className="text-[12px] text-muted">All guests assigned.</p>}
            </div>
          </div>
        </div>
      )}

      {/* CEREMONY TAB */}
      {tab === "ceremony" && (
        <div>
          <p className="text-[13px] text-muted mb-6">Arrange who stands at the altar during the ceremony. <Tooltip text="Left and Right are from the guests' perspective facing the altar. Center is for the officiant and couple at the altar itself." wide /></p>

          {/* Altar visualization */}
          <div className="bg-white rounded-[16px] border border-border p-8">
            {/* Officiant + Couple at center */}
            <div className="text-center mb-8">
              <div className="inline-block bg-lavender rounded-[16px] px-8 py-4 min-w-[200px]">
                <p className="text-[12px] text-muted uppercase font-semibold tracking-wide">Altar</p>
                {centerPositions.length === 0 && (
                  <p className="text-[13px] text-muted mt-2">Add the officiant and couple below</p>
                )}
                {centerPositions.map((p) => (
                  <div key={p.id} className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-[15px] font-semibold text-plum">{p.person_name}</span>
                    <span className="badge">{p.role || p.person_type}</span>
                    <button onClick={() => removeCeremonyPosition(p.id)} aria-label={`Remove ${p.person_name} from ceremony`} className="w-6 h-6 flex items-center justify-center text-[12px] text-error hover:opacity-80 rounded-full">x</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Two sides */}
            <div className="grid grid-cols-2 gap-12 max-w-2xl mx-auto">
              {/* Left side */}
              <div>
                <h3 className="text-[13px] font-semibold text-muted text-center mb-3">Left Side</h3>
                <div className="space-y-2">
                  {leftSide.map((p, i) => (
                    <div key={p.id} className="card-list flex items-center gap-2 px-3 py-2">
                      <span className="text-[12px] text-muted w-4">{i + 1}</span>
                      <span className="flex-1 text-[15px] text-plum">{p.person_name}</span>
                      {p.role && <span className="text-[12px] text-muted">{p.role}</span>}
                      <button onClick={() => removeCeremonyPosition(p.id)} aria-label={`Remove ${p.person_name} from left side`} className="w-6 h-6 flex items-center justify-center text-[12px] text-error hover:opacity-80 rounded-full">x</button>
                    </div>
                  ))}
                  {leftSide.length === 0 && <p className="text-[13px] text-muted text-center py-4">No one added yet</p>}
                </div>
              </div>

              {/* Right side */}
              <div>
                <h3 className="text-[13px] font-semibold text-muted text-center mb-3">Right Side</h3>
                <div className="space-y-2">
                  {rightSide.map((p, i) => (
                    <div key={p.id} className="card-list flex items-center gap-2 px-3 py-2">
                      <span className="text-[12px] text-muted w-4">{i + 1}</span>
                      <span className="flex-1 text-[15px] text-plum">{p.person_name}</span>
                      {p.role && <span className="text-[12px] text-muted">{p.role}</span>}
                      <button onClick={() => removeCeremonyPosition(p.id)} aria-label={`Remove ${p.person_name} from right side`} className="w-6 h-6 flex items-center justify-center text-[12px] text-error hover:opacity-80 rounded-full">x</button>
                    </div>
                  ))}
                  {rightSide.length === 0 && <p className="text-[13px] text-muted text-center py-4">No one added yet</p>}
                </div>
              </div>
            </div>

            {/* Guest seating indicator */}
            <div className="mt-10 text-center">
              <div className="inline-block bg-whisper rounded-full px-6 py-2 border border-border">
                <p className="text-[13px] text-muted">Guest Seating Area</p>
              </div>
            </div>
          </div>

          {/* Add people to ceremony */}
          <div className="mt-6 card p-4">
            <h2 className="text-[15px] font-semibold text-plum mb-3">Add to ceremony</h2>

            {/* Quick add from wedding party */}
            {availableParty.length > 0 && (
              <div className="mb-4">
                <p className="text-[13px] text-muted mb-2">From your wedding party:</p>
                <div className="space-y-2">
                  {availableParty.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-[15px] text-plum flex-1">{m.name}</span>
                      <span className="text-[12px] text-muted">{m.role}</span>
                      <button
                        onClick={() => addCeremonyPosition(m.name, "wedding_party", "left", m.role)}
                        className="btn-secondary btn-sm"
                      >
                        Left
                      </button>
                      <button
                        onClick={() => addCeremonyPosition(m.name, "wedding_party", "right", m.role)}
                        className="btn-secondary btn-sm"
                      >
                        Right
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual add buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  const name = prompt("Officiant name:");
                  if (name) addCeremonyPosition(name, "officiant", "center", "Officiant");
                }}
                className="btn-ghost btn-sm"
              >
                Add Officiant
              </button>
              <button
                onClick={() => {
                  const name = prompt("Name:");
                  if (name) addCeremonyPosition(name, "couple", "center", "Couple");
                }}
                className="btn-ghost btn-sm"
              >
                Add to Altar
              </button>
              <button
                onClick={() => {
                  const name = prompt("Name:");
                  if (!name) return;
                  const role = prompt("Role (e.g. Bridesmaid, Groomsman):") || undefined;
                  addCeremonyPosition(name, "wedding_party", "left", role);
                }}
                className="btn-ghost btn-sm"
              >
                Add to Left Side
              </button>
              <button
                onClick={() => {
                  const name = prompt("Name:");
                  if (!name) return;
                  const role = prompt("Role (e.g. Bridesmaid, Groomsman):") || undefined;
                  addCeremonyPosition(name, "wedding_party", "right", role);
                }}
                className="btn-ghost btn-sm"
              >
                Add to Right Side
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteTable !== null}
        title="Delete table?"
        message="This table and all its guest assignments will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteTable) deleteTable(confirmDeleteTable);
          setConfirmDeleteTable(null);
        }}
        onCancel={() => setConfirmDeleteTable(null)}
      />
    </div>
  );
}
