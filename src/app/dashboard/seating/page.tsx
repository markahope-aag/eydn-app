"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tooltip } from "@/components/Tooltip";
import { escapeHtml } from "@/lib/validation";

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
  const [noWedding, setNoWedding] = useState(false);
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
  const [zoom, setZoom] = useState(1);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [partner1, setPartner1] = useState("Partner 1");
  const [partner2, setPartner2] = useState("Partner 2");
  const undoStack = useRef<{ type: "assign" | "unassign"; guestId: string; tableId?: string }[]>([]);
  const [undoCount, setUndoCount] = useState(0); // trigger re-render on undo stack change

  useEffect(() => {
    Promise.all([
      fetch("/api/seating/tables").then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : [];
      }),
      fetch("/api/guests").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/seating/assignments").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/wedding-party").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/ceremony").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/weddings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([t, g, a, p, c, w]) => {
        setTables(t);
        setGuests(g);
        setAssignments(a);
        setPartyMembers(p);
        setCeremonyPositions(c);
        if (w) {
          if (w.partner1_name) setPartner1(w.partner1_name);
          if (w.partner2_name) setPartner2(w.partner2_name);
        }
      })
      .catch(() => toast.error("Couldn't load seating data. Try refreshing."))
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
          }).catch((err) => console.error("Failed to save table position", err));
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
      toast.error("Table didn't save. Try again.");
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
    // Track previous state for undo
    const prevAssignment = assignments.find((a) => a.guest_id === guestId);
    undoStack.current.push({
      type: "assign",
      guestId,
      tableId: prevAssignment?.seating_table_id, // previous table (undefined = was unassigned)
    });
    setUndoCount((c) => c + 1);

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
      undoStack.current.pop();
      setUndoCount((c) => c + 1);
      toast.error("Failed to assign guest");
    }
  }

  async function unassignGuest(guestId: string) {
    const prevAssignment = assignments.find((a) => a.guest_id === guestId);
    if (prevAssignment) {
      undoStack.current.push({
        type: "unassign",
        guestId,
        tableId: prevAssignment.seating_table_id,
      });
      setUndoCount((c) => c + 1);
    }

    const prev = assignments;
    setAssignments((a) => a.filter((x) => x.guest_id !== guestId));
    try {
      await fetch(`/api/seating/assignments?guest_id=${guestId}`, { method: "DELETE" });
    } catch {
      setAssignments(prev);
      undoStack.current.pop();
      setUndoCount((c) => c + 1);
    }
  }

  async function handleUndo() {
    const action = undoStack.current.pop();
    if (!action) return;
    setUndoCount((c) => c + 1);

    if (action.type === "assign") {
      // Undo an assign: either unassign or reassign to previous table
      if (action.tableId) {
        // Was on a different table — move back
        const tempId = crypto.randomUUID();
        setAssignments((prev) => [
          ...prev.filter((a) => a.guest_id !== action.guestId),
          { id: tempId, seating_table_id: action.tableId!, guest_id: action.guestId, seat_number: null },
        ]);
        try {
          const res = await fetch("/api/seating/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seating_table_id: action.tableId, guest_id: action.guestId }),
          });
          if (res.ok) {
            const saved = await res.json();
            setAssignments((prev) => prev.map((a) => (a.id === tempId ? saved : a)));
          }
        } catch { /* best effort */ }
      } else {
        // Was unassigned — remove assignment
        setAssignments((a) => a.filter((x) => x.guest_id !== action.guestId));
        try {
          await fetch(`/api/seating/assignments?guest_id=${action.guestId}`, { method: "DELETE" });
        } catch { /* best effort */ }
      }
    } else {
      // Undo an unassign: reassign to the table they were on
      if (action.tableId) {
        const tempId = crypto.randomUUID();
        setAssignments((prev) => [
          ...prev,
          { id: tempId, seating_table_id: action.tableId!, guest_id: action.guestId, seat_number: null },
        ]);
        try {
          const res = await fetch("/api/seating/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seating_table_id: action.tableId, guest_id: action.guestId }),
          });
          if (res.ok) {
            const saved = await res.json();
            setAssignments((prev) => prev.map((a) => (a.id === tempId ? saved : a)));
          }
        } catch { /* best effort */ }
      }
    }
    toast("Undone");
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

  async function reorderPosition(id: string, side: "left" | "right" | "center", direction: "up" | "down") {
    const sidePositions = ceremonyPositions
      .filter((p) => p.side === side)
      .sort((a, b) => a.position_order - b.position_order);
    const idx = sidePositions.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sidePositions.length) return;

    const current = sidePositions[idx];
    const swap = sidePositions[swapIdx];

    // Optimistic update
    setCeremonyPositions((prev) =>
      prev.map((p) => {
        if (p.id === current.id) return { ...p, position_order: swap.position_order };
        if (p.id === swap.id) return { ...p, position_order: current.position_order };
        return p;
      })
    );

    // Save both
    try {
      await Promise.all([
        fetch(`/api/ceremony?id=${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position_order: swap.position_order }),
        }),
        fetch(`/api/ceremony?id=${swap.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position_order: current.position_order }),
        }),
      ]);
    } catch {
      toast.error("Reorder didn't save. Try again.");
    }
  }

  function printCeremony() {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const esc = escapeHtml;
    const centerHtml = centerPositions.map((p) => `<div style="font-size:18px;font-weight:600;color:#1A1A2E;margin:6px 0">${esc(p.person_name)} <span style="font-size:13px;color:#8E7A9E;font-weight:400">${esc(p.role || "")}</span></div>`).join("");
    const sideHtml = (positions: CeremonyPosition[]) => positions.length === 0
      ? '<p style="color:#8E7A9E;font-size:14px;text-align:center;padding:16px 0">—</p>'
      : positions.sort((a, b) => a.position_order - b.position_order).map((p, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid #E8D5B7"><span style="color:#8E7A9E;font-size:13px;width:20px">${i + 1}</span><span style="font-size:15px;color:#1A1A2E;flex:1">${esc(p.person_name)}</span><span style="font-size:12px;color:#8E7A9E">${esc(p.role || "")}</span></div>`).join("");

    printWin.document.write(`<!DOCTYPE html><html><head><title>Ceremony Layout</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#1A1A2E}@media print{body{padding:20px}}</style></head><body>
      <h1 style="font-size:24px;margin-bottom:4px">Ceremony Layout</h1>
      <p style="color:#8E7A9E;font-size:13px;margin-bottom:32px">Processional order: #1 walks first</p>
      <div style="text-align:center;background:#EDE7DF;border-radius:12px;padding:24px;margin-bottom:32px">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8E7A9E;font-weight:600">Altar</p>
        ${centerHtml}
      </div>
      <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;max-width:700px;margin:0 auto">
        <div><h3 style="text-align:center;font-size:14px;color:#8E7A9E;margin-bottom:12px">Left Side</h3>${sideHtml(leftSide)}</div>
        <div style="display:flex;align-items:stretch;justify-content:center"><div style="width:2px;background:linear-gradient(to bottom,#E8D5B7,#D4A5A5);border-radius:1px"></div></div>
        <div><h3 style="text-align:center;font-size:14px;color:#8E7A9E;margin-bottom:12px">Right Side</h3>${sideHtml(rightSide)}</div>
      </div>
      <div style="text-align:center;margin-top:40px"><div style="display:inline-block;background:#FAF8FC;border-radius:999px;padding:8px 24px;border:1px solid #E8D5B7"><p style="font-size:13px;color:#8E7A9E">Guest Seating</p></div></div>
      <p style="text-align:center;color:#8E7A9E;font-size:11px;margin-top:32px">Generated by eydn.app</p>
    </body></html>`);
    printWin.document.close();
    printWin.print();
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

  function getTableAssignments(tableId: string) {
    return assignments.filter((a) => a.seating_table_id === tableId);
  }

  function getTableGuests(tableId: string) {
    const tableAssigns = getTableAssignments(tableId);
    return guests.filter((g) => tableAssigns.some((a) => a.guest_id === g.id));
  }

  /** Return an array of length `capacity` where each index is either a guest or null, respecting seat_number assignments. */
  function getSeatMap(tableId: string, capacity: number): (Guest | null)[] {
    const tableAssigns = getTableAssignments(tableId);
    const seats: (Guest | null)[] = Array.from({ length: capacity }, () => null);
    const unpositioned: Guest[] = [];

    for (const a of tableAssigns) {
      const guest = guests.find((g) => g.id === a.guest_id);
      if (!guest) continue;
      if (a.seat_number != null && a.seat_number >= 1 && a.seat_number <= capacity) {
        seats[a.seat_number - 1] = guest; // seat_number is 1-indexed
      } else {
        unpositioned.push(guest);
      }
    }

    // Fill unpositioned guests into empty seats
    let nextEmpty = 0;
    for (const guest of unpositioned) {
      while (nextEmpty < capacity && seats[nextEmpty] !== null) nextEmpty++;
      if (nextEmpty < capacity) {
        seats[nextEmpty] = guest;
        nextEmpty++;
      }
    }

    return seats;
  }

  async function updateSeatNumber(guestId: string, tableId: string, seatNumber: number | null) {
    setAssignments((prev) =>
      prev.map((a) => a.guest_id === guestId ? { ...a, seat_number: seatNumber } : a)
    );
    try {
      const res = await fetch("/api/seating/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seating_table_id: tableId, guest_id: guestId, seat_number: seatNumber }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setAssignments((prev) => prev.map((a) => a.guest_id === guestId ? saved : a));
    } catch {
      toast.error("Failed to update seat");
    }
  }

  const leftSide = ceremonyPositions.filter((p) => p.side === "left");
  const rightSide = ceremonyPositions.filter((p) => p.side === "right");
  const centerPositions = ceremonyPositions.filter((p) => p.side === "center");
  const assignedPartyNames = new Set(ceremonyPositions.map((p) => p.person_name));
  const availableParty = partyMembers.filter((m) => !assignedPartyNames.has(m.name));

  if (loading) return <SkeletonList count={4} />;

  if (noWedding) return <NoWeddingState feature="Seating Chart" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1>Seating Chart</h1>
        <div className="flex gap-1" role="tablist">
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
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 gap-3">
              <p className="text-[13px] text-muted flex-1">Drag tables to reposition. Drag guests onto tables.</p>
              <div className="flex items-center gap-2">
                {/* Undo */}
                <button
                  onClick={handleUndo}
                  disabled={undoStack.current.length === 0}
                  aria-label="Undo last action"
                  title="Undo"
                  className="w-8 h-8 rounded-[8px] bg-lavender text-violet flex items-center justify-center hover:bg-violet hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  data-undo-count={undoCount /* keep reactivity */}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 6H10C12.2091 6 14 7.79086 14 10C14 12.2091 12.2091 14 10 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 3L3 6L6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {/* Zoom controls */}
                <div className="flex items-center gap-1 bg-lavender rounded-[8px] px-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                    aria-label="Zoom out"
                    className="w-7 h-7 text-violet font-semibold text-[16px] flex items-center justify-center hover:text-plum transition"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-semibold text-plum w-9 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                    aria-label="Zoom in"
                    className="w-7 h-7 text-violet font-semibold text-[16px] flex items-center justify-center hover:text-plum transition"
                  >
                    +
                  </button>
                </div>
                <button onClick={addTable} className="btn-primary btn-sm">Add Table</button>
              </div>
            </div>

            <div
              ref={canvasRef}
              className="relative bg-white rounded-[16px] border border-border flex-1 overflow-auto"
              tabIndex={0}
              role="region"
              aria-label="Seating chart canvas"
              style={{ minHeight: 500 }}
              onDragOver={(e) => e.preventDefault()}
            >
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", minWidth: 900, minHeight: 600 }}>
              {tables.map((table) => {
                const tableGuests = getTableGuests(table.id);
                const seatMap = getSeatMap(table.id, table.capacity);
                const isFull = tableGuests.length >= table.capacity;
                const isRound = table.shape === "round";
                const tableSize = isRound ? 140 : undefined;

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
                    {/* Table shape */}
                    {isRound ? (
                      /* Round table — circular with seat dots around perimeter */
                      <div
                        className={`relative border-2 bg-[#FAF8FC] shadow-sm ${isFull ? "border-violet" : "border-border"}`}
                        style={{ width: tableSize, height: tableSize, borderRadius: "50%" }}
                      >
                        {/* Seat position dots around the circle */}
                        {seatMap.map((guest, i) => {
                          const angle = (i / table.capacity) * 2 * Math.PI - Math.PI / 2;
                          const r = (tableSize! / 2) + 10;
                          const cx = tableSize! / 2 + r * Math.cos(angle);
                          const cy = tableSize! / 2 + r * Math.sin(angle);
                          return (
                            <div
                              key={i}
                              className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-semibold ${
                                guest ? "bg-violet text-white" : "bg-lavender text-muted"
                              }`}
                              style={{ left: cx - 10, top: cy - 10 }}
                              title={guest?.name || `Seat ${i + 1}`}
                            >
                              {guest ? guest.name.split(" ").map((w) => w[0]).join("").slice(0, 2) : ""}
                            </div>
                          );
                        })}
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                          <p className="text-[11px] font-semibold text-plum leading-tight">
                            {table.name || `Table ${table.table_number}`}
                          </p>
                          <p className="text-[9px] text-muted">
                            {tableGuests.length}/{table.capacity}
                          </p>
                          {/* Guest names inside */}
                          <div className="mt-1 max-h-[50px] overflow-hidden">
                            {tableGuests.slice(0, 4).map((g) => (
                              <p key={g.id} className="text-[8px] text-muted leading-tight truncate max-w-[80px]">{g.name}</p>
                            ))}
                            {tableGuests.length > 4 && (
                              <p className="text-[8px] text-muted">+{tableGuests.length - 4} more</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Rectangle table — wider, more elongated */
                      <div
                        className={`relative border-2 bg-[#FAF8FC] shadow-sm rounded-[12px] ${isFull ? "border-violet" : "border-border"}`}
                        style={{ width: 200, minHeight: 90 }}
                      >
                        {/* Seat dots along top and bottom edges */}
                        {seatMap.map((guest, i) => {
                          const isTop = i < Math.ceil(table.capacity / 2);
                          const sideIndex = isTop ? i : i - Math.ceil(table.capacity / 2);
                          const sideCount = isTop ? Math.ceil(table.capacity / 2) : Math.floor(table.capacity / 2);
                          const xPct = sideCount > 1 ? 12 + (sideIndex / (sideCount - 1)) * 76 : 50;
                          return (
                            <div
                              key={i}
                              className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-semibold ${
                                guest ? "bg-violet text-white" : "bg-lavender text-muted"
                              }`}
                              style={{
                                left: `${xPct}%`,
                                top: isTop ? -12 : undefined,
                                bottom: isTop ? undefined : -12,
                                transform: "translateX(-50%)",
                              }}
                              title={guest?.name || `Seat ${i + 1}`}
                            >
                              {guest ? guest.name.split(" ").map((w) => w[0]).join("").slice(0, 2) : ""}
                            </div>
                          );
                        })}
                        {/* Center content */}
                        <div className="flex flex-col items-center justify-center text-center px-3 py-3">
                          <p className="text-[11px] font-semibold text-plum leading-tight">
                            {table.name || `Table ${table.table_number}`}
                          </p>
                          <p className="text-[9px] text-muted">
                            {tableGuests.length}/{table.capacity}
                          </p>
                          <div className="mt-1 max-h-[40px] overflow-hidden">
                            {tableGuests.slice(0, 3).map((g) => (
                              <p key={g.id} className="text-[8px] text-muted leading-tight truncate max-w-[140px]">{g.name}</p>
                            ))}
                            {tableGuests.length > 3 && (
                              <p className="text-[8px] text-muted">+{tableGuests.length - 3} more</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === table.id ? null : table.id); }}
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted hover:text-violet transition bg-white border border-border rounded-full px-2 py-0.5 z-10"
                    >
                      {editingTable === table.id ? "Done" : "Edit"}
                    </button>

                    {/* Edit popover */}
                    {editingTable === table.id && (
                      <div
                        className="absolute top-full left-0 mt-4 z-20 bg-white border border-border rounded-[12px] shadow-lg p-3 space-y-3 w-52"
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
                          <label className="text-[11px] font-semibold text-muted">Shape</label>
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
                        {/* Seated guests list with seat assignment and remove */}
                        {tableGuests.length > 0 && (
                          <div>
                            <label className="text-[11px] font-semibold text-muted">Seated</label>
                            <div className="mt-0.5 space-y-1">
                              {tableGuests.map((g) => {
                                const assignment = assignments.find((a) => a.guest_id === g.id);
                                const takenSeats = new Set(
                                  getTableAssignments(table.id)
                                    .filter((a) => a.seat_number != null && a.guest_id !== g.id)
                                    .map((a) => a.seat_number)
                                );
                                return (
                                  <div key={g.id} className="flex items-center gap-1 text-[11px]">
                                    <span className="text-plum truncate flex-1">{g.name}</span>
                                    <select
                                      value={assignment?.seat_number ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : null;
                                        updateSeatNumber(g.id, table.id, val);
                                      }}
                                      className="rounded border-border px-1 py-0.5 text-[10px] w-14"
                                      title="Assign to specific seat"
                                    >
                                      <option value="">Auto</option>
                                      {Array.from({ length: table.capacity }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n} disabled={takenSeats.has(n)}>
                                          Seat {n}
                                        </option>
                                      ))}
                                    </select>
                                    <button onClick={() => unassignGuest(g.id)} className="text-muted hover:text-error text-[10px]">unseat</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteTable(table.id); }}
                      aria-label={`Delete ${table.name || `Table ${table.table_number}`}`}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-border text-muted hover:text-error hover:border-error rounded-full text-[10px] flex items-center justify-center transition z-10"
                    >
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
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
          </div>

          {/* Guest sidebar */}
          <div className="w-56 flex-shrink-0 flex flex-col">
            <h2 className="text-[15px] font-semibold text-muted mb-2">Unassigned ({unassignedGuests.length})</h2>
            <input
              type="text"
              placeholder="Search guests..."
              value={unassignedSearch}
              onChange={(e) => setUnassignedSearch(e.target.value)}
              aria-label="Search unassigned guests"
              className="rounded-[10px] border-border px-3 py-1.5 text-[13px] mb-2"
            />
            <div className="space-y-1 flex-1 overflow-y-auto" aria-label="Unassigned guests — drag to a table or use the dropdown to assign">
              {unassignedGuests
                .filter((g) => !unassignedSearch || g.name.toLowerCase().includes(unassignedSearch.toLowerCase()))
                .map((guest) => (
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-muted">Arrange who stands at the altar. Left/Right are from the guests&apos; perspective. <Tooltip text="The number beside each name is their processional order — #1 walks first. Use the arrows to reorder." wide /></p>
            <div className="flex gap-2">
              <button onClick={printCeremony} className="btn-secondary btn-sm inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6V1H12V6M4 12H2.5C1.67157 12 1 11.3284 1 10.5V7.5C1 6.67157 1.67157 6 2.5 6H13.5C14.3284 6 15 6.67157 15 7.5V10.5C15 11.3284 14.3284 12 13.5 12H12M4 9H12V15H4V9Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Print
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted mb-6">This layout is also included in your downloadable Day-of Binder.</p>

          {/* Altar visualization — prominent at top */}
          <div className="bg-white rounded-[16px] border border-border overflow-hidden">
            {/* Altar — large, prominent */}
            <div className="bg-gradient-to-b from-lavender to-white px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6 text-center">
              <p className="text-[11px] text-muted uppercase font-semibold tracking-widest mb-3">Altar</p>
              <div className="inline-block bg-white rounded-[16px] px-4 sm:px-10 py-4 sm:py-5 min-w-0 sm:min-w-[280px] w-full sm:w-auto shadow-sm border border-border">
                {centerPositions.length === 0 && (
                  <p className="text-[13px] text-muted">Add the officiant and couple below</p>
                )}
                {centerPositions.map((p) => (
                  <div key={p.id} className="flex items-center justify-center gap-2 mt-2 first:mt-0">
                    <span className="text-[17px] font-semibold text-plum">{p.person_name}</span>
                    <span className="badge">{p.role || p.person_type}</span>
                    <button onClick={() => removeCeremonyPosition(p.id)} aria-label={`Remove ${p.person_name}`} className="text-muted hover:text-error transition">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Two sides with aisle line between */}
            <div className="px-4 sm:px-8 py-4 sm:py-6">
              <div className="grid grid-cols-[1fr_40px_1fr] gap-0 max-w-2xl mx-auto">
                {/* Left side */}
                <div>
                  <h3 className="text-[12px] font-semibold text-muted text-center mb-3 uppercase tracking-wide">Left Side</h3>
                  <div className="space-y-1.5">
                    {leftSide.sort((a, b) => a.position_order - b.position_order).map((p, i) => (
                      <div key={p.id} className="group/pos card-list flex items-center gap-2 px-3 py-2">
                        <span className="text-[11px] font-bold text-violet bg-lavender rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0" title={`Processional order: #${i + 1} walks first`}>{i + 1}</span>
                        <span className="flex-1 text-[15px] text-plum font-medium">{p.person_name}</span>
                        {p.role && <span className="text-[11px] text-muted">{p.role}</span>}
                        <div className="flex flex-col opacity-0 group-hover/pos:opacity-100 transition-opacity">
                          <button
                            onClick={() => reorderPosition(p.id, "left", "up")}
                            disabled={i === 0}
                            aria-label="Move up in processional order"
                            className="text-muted hover:text-violet disabled:opacity-20 leading-none"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2L10 7H2L6 2Z" fill="currentColor"/></svg>
                          </button>
                          <button
                            onClick={() => reorderPosition(p.id, "left", "down")}
                            disabled={i === leftSide.length - 1}
                            aria-label="Move down in processional order"
                            className="text-muted hover:text-violet disabled:opacity-20 leading-none"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10L2 5H10L6 10Z" fill="currentColor"/></svg>
                          </button>
                        </div>
                        <button onClick={() => removeCeremonyPosition(p.id)} aria-label={`Remove ${p.person_name}`} className="opacity-0 group-hover/pos:opacity-100 text-muted hover:text-error transition-opacity">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    ))}
                    {leftSide.length === 0 && <p className="text-[13px] text-muted text-center py-6">No one added yet</p>}
                  </div>
                </div>

                {/* Aisle line */}
                <div className="flex items-stretch justify-center">
                  <div className="w-[2px] rounded-full" style={{ background: "linear-gradient(to bottom, var(--border, #E8D5B7), var(--blush, #D4A5A5), var(--border, #E8D5B7))" }} />
                </div>

                {/* Right side */}
                <div>
                  <h3 className="text-[12px] font-semibold text-muted text-center mb-3 uppercase tracking-wide">Right Side</h3>
                  <div className="space-y-1.5">
                    {rightSide.sort((a, b) => a.position_order - b.position_order).map((p, i) => (
                      <div key={p.id} className="group/pos card-list flex items-center gap-2 px-3 py-2">
                        <span className="text-[11px] font-bold text-violet bg-lavender rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0" title={`Processional order: #${i + 1} walks first`}>{i + 1}</span>
                        <span className="flex-1 text-[15px] text-plum font-medium">{p.person_name}</span>
                        {p.role && <span className="text-[11px] text-muted">{p.role}</span>}
                        <div className="flex flex-col opacity-0 group-hover/pos:opacity-100 transition-opacity">
                          <button
                            onClick={() => reorderPosition(p.id, "right", "up")}
                            disabled={i === 0}
                            aria-label="Move up in processional order"
                            className="text-muted hover:text-violet disabled:opacity-20 leading-none"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2L10 7H2L6 2Z" fill="currentColor"/></svg>
                          </button>
                          <button
                            onClick={() => reorderPosition(p.id, "right", "down")}
                            disabled={i === rightSide.length - 1}
                            aria-label="Move down in processional order"
                            className="text-muted hover:text-violet disabled:opacity-20 leading-none"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10L2 5H10L6 10Z" fill="currentColor"/></svg>
                          </button>
                        </div>
                        <button onClick={() => removeCeremonyPosition(p.id)} aria-label={`Remove ${p.person_name}`} className="opacity-0 group-hover/pos:opacity-100 text-muted hover:text-error transition-opacity">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    ))}
                    {rightSide.length === 0 && <p className="text-[13px] text-muted text-center py-6">No one added yet</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Guest seating indicator — smaller, at bottom */}
            <div className="pb-6 text-center">
              <div className="inline-flex items-center gap-2 bg-[#FAF8FC] rounded-full px-5 py-2 border border-border">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1Z" stroke="var(--muted)" strokeWidth="1.2"/>
                  <path d="M5.5 6.5H10.5M5 9.5H11" stroke="var(--muted)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <p className="text-[12px] text-muted">Guest Seating</p>
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
                onClick={() => addCeremonyPosition(partner1, "couple", "center", "Couple")}
                className="btn-ghost btn-sm"
              >
                Add {partner1}
              </button>
              <button
                onClick={() => addCeremonyPosition(partner2, "couple", "center", "Couple")}
                className="btn-ghost btn-sm"
              >
                Add {partner2}
              </button>
              <button
                onClick={() => {
                  const name = prompt("Name:");
                  if (!name) return;
                  const role = prompt("Role (e.g. Attendant, Reader):") || undefined;
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
                  const role = prompt("Role (e.g. Attendant, Reader):") || undefined;
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
        message="This permanently removes this table and its seat assignments."
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
