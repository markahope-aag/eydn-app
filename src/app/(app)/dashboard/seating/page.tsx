"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tooltip } from "@/components/Tooltip";
import type {
  Table,
  Guest,
  Assignment,
  WeddingPartyMember,
  CeremonyPosition,
  FloorObject,
  Tab,
} from "./_types";
import {
  getTableAssignments as getTableAssignmentsHelper,
  getTableGuests as getTableGuestsHelper,
  getSeatMap as getSeatMapHelper,
} from "./_helpers";
import { printCeremony as printCeremonyHelper } from "./_ceremony-print";

// Default table footprints (canvas px) used when a table has no explicit
// width/height yet, plus the floor each can be dragged down to.
const ROUND_DEFAULT_SIZE = 140;
const RECT_DEFAULT_WIDTH = 200;
const RECT_DEFAULT_HEIGHT = 90;
const ROUND_MIN_SIZE = 90;
const RECT_MIN_WIDTH = 120;
const RECT_MIN_HEIGHT = 70;

export default function SeatingPage() {
  const [tab, setTab] = useState<Tab>("reception");
  const [tables, setTables] = useState<Table[]>([]);
  const [noWedding, setNoWedding] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [partyMembers, setPartyMembers] = useState<WeddingPartyMember[]>([]);
  const [ceremonyPositions, setCeremonyPositions] = useState<CeremonyPosition[]>([]);
  const [floorObjects, setFloorObjects] = useState<FloorObject[]>([]);
  const [draggingObject, setDraggingObject] = useState<string | null>(null);
  const [resizingObject, setResizingObject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggingGuest, setDraggingGuest] = useState<string | null>(null);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<string | null>(null);
  const [addingTable, setAddingTable] = useState(false);
  const [resizingTable, setResizingTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [partner1, setPartner1] = useState("Partner 1");
  const [partner2, setPartner2] = useState("Partner 2");
  const [ceremonyAddName, setCeremonyAddName] = useState("");
  const [ceremonyAddRole, setCeremonyAddRole] = useState("");
  const [officiantName, setOfficiantName] = useState("");
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
      fetch("/api/seating/floor-objects").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([t, g, a, p, c, w, fo]) => {
        setTables(t);
        setGuests(g);
        setAssignments(a);
        setPartyMembers(p);
        setCeremonyPositions(c);
        setFloorObjects(fo);
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
          }).catch(() => toast.error("Couldn't save the table position. Try moving it again."));
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

  // --- Table resizing (mirrors the floor-object resize) ---
  useEffect(() => {
    if (!resizingTable) return;
    function onMouseMove(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== resizingTable) return t;
          const rawW = e.clientX - rect.left - t.x;
          const rawH = e.clientY - rect.top - t.y;
          if (t.shape === "round") {
            // Keep round tables circular: one diameter from the larger drag.
            const size = Math.max(ROUND_MIN_SIZE, rawW, rawH);
            return { ...t, width: size, height: size };
          }
          return {
            ...t,
            width: Math.max(RECT_MIN_WIDTH, rawW),
            height: Math.max(RECT_MIN_HEIGHT, rawH),
          };
        })
      );
    }
    function onMouseUp() {
      setTables((prev) => {
        const t = prev.find((x) => x.id === resizingTable);
        if (t) {
          fetch(`/api/seating/tables/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width: t.width, height: t.height }),
          }).catch(() => toast.error("Couldn't save that size. Try again."));
        }
        return prev;
      });
      setResizingTable(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizingTable]);

  function handleTableResizeMouseDown(e: React.MouseEvent, tableId: string) {
    e.preventDefault();
    e.stopPropagation();
    setResizingTable(tableId);
  }

  // --- Floor-plan object dragging & resizing ---
  const handleObjectMouseDown = useCallback((e: React.MouseEvent, objId: string, ox: number, oy: number) => {
    e.preventDefault();
    setDraggingObject(objId);
    const rect = canvasRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left || 0) - ox,
      y: e.clientY - (rect?.top || 0) - oy,
    };
  }, []);

  useEffect(() => {
    if (!draggingObject) return;
    function onMouseMove(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = Math.max(0, e.clientX - rect.left - dragOffset.current.x);
      const newY = Math.max(0, e.clientY - rect.top - dragOffset.current.y);
      setFloorObjects((prev) =>
        prev.map((o) => (o.id === draggingObject ? { ...o, x: newX, y: newY } : o))
      );
    }
    function onMouseUp() {
      setFloorObjects((prev) => {
        const o = prev.find((x) => x.id === draggingObject);
        if (o) {
          fetch(`/api/seating/floor-objects?id=${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: o.x, y: o.y }),
          }).catch(() => toast.error("Couldn't save that position. Try again."));
        }
        return prev;
      });
      setDraggingObject(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingObject]);

  useEffect(() => {
    if (!resizingObject) return;
    function onMouseMove(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setFloorObjects((prev) =>
        prev.map((o) => {
          if (o.id !== resizingObject) return o;
          const width = Math.max(80, e.clientX - rect.left - o.x);
          const height = Math.max(50, e.clientY - rect.top - o.y);
          return { ...o, width, height };
        })
      );
    }
    function onMouseUp() {
      setFloorObjects((prev) => {
        const o = prev.find((x) => x.id === resizingObject);
        if (o) {
          fetch(`/api/seating/floor-objects?id=${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width: o.width, height: o.height }),
          }).catch(() => toast.error("Couldn't save that size. Try again."));
        }
        return prev;
      });
      setResizingObject(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizingObject]);

  function handleObjectResizeMouseDown(e: React.MouseEvent, objId: string) {
    e.preventDefault();
    e.stopPropagation();
    setResizingObject(objId);
  }

  async function addFloorObject() {
    const offset = floorObjects.length % 5;
    try {
      const res = await fetch("/api/seating/floor-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "New area",
          x: 60 + offset * 40,
          y: 60 + offset * 40,
          width: 180,
          height: 110,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setFloorObjects((prev) => [...prev, saved]);
    } catch {
      toast.error("Couldn't add that area. Try again.");
    }
  }

  async function updateFloorObject(id: string, updates: Partial<FloorObject>) {
    setFloorObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    try {
      const res = await fetch(`/api/seating/floor-objects?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Couldn't save that change. Try again.");
    }
  }

  async function deleteFloorObject(id: string) {
    const prev = floorObjects;
    setFloorObjects((o) => o.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/seating/floor-objects?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setFloorObjects(prev);
      toast.error("Couldn't remove that area. Try again.");
    }
  }

  // --- Reception functions ---
  async function addTable() {
    // Guard against a double-click (or slow network) firing two creates with
    // the same number before state updates — that's how duplicate tables end
    // up in the data.
    if (addingTable) return;
    setAddingTable(true);

    // Derive the next number from the highest existing table_number, not the
    // array length. After a table is deleted the length no longer matches the
    // numbering, so length+1 can re-create a number that already exists.
    const nextNum =
      tables.reduce((max, t) => Math.max(max, t.table_number || 0), 0) + 1;
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
      if (!res.ok) {
        // Surface the server's actual reason (validation, read-only role,
        // wedding-not-found, etc.) instead of a generic message so the
        // failure is diagnosable rather than silently swallowed.
        const detail = await res.json().catch(() => null);
        const reason = detail?.error || `request failed (${res.status})`;
        console.error("[seating] addTable failed:", reason);
        toast.error(`Table didn't save: ${reason}`);
        return;
      }
      const saved = await res.json();
      setTables((prev) => [...prev, saved]);
    } catch (err) {
      console.error("[seating] addTable network error", err);
      toast.error("Table didn't save. Check your connection and try again.");
    } finally {
      setAddingTable(false);
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
        } catch (e) { console.error("[seating] restore failed", e); }
      } else {
        // Was unassigned — remove assignment
        setAssignments((a) => a.filter((x) => x.guest_id !== action.guestId));
        try {
          await fetch(`/api/seating/assignments?guest_id=${action.guestId}`, { method: "DELETE" });
        } catch (e) { console.error("[seating] restore failed", e); }
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
        } catch (e) { console.error("[seating] restore failed", e); }
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
    printCeremonyHelper(ceremonyPositions);
  }

  const [editingTable, setEditingTable] = useState<string | null>(null);
  const editPopoverRef = useRef<HTMLDivElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (!editingTable) return;
    function closeOnOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (editPopoverRef.current?.contains(target)) return;
      if (editButtonRef.current?.contains(target)) return;
      setEditingTable(null);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [editingTable]);

  // Quick-add a guest without leaving the seating chart.
  async function addGuestFromSeating() {
    const name = newGuestName.trim();
    if (!name) return;
    setNewGuestName("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rsvp_status: "accepted" }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setGuests((prev) => [...prev, saved]);
      toast.success(`${name} added`);
    } catch {
      toast.error("Couldn't add that guest. Try again.");
    }
  }

  const assignedGuestIds = new Set(assignments.map((a) => a.guest_id));
  const unassignedGuests = guests.filter((g) => !assignedGuestIds.has(g.id) && g.rsvp_status !== "declined");

  function getTableAssignments(tableId: string) {
    return getTableAssignmentsHelper(assignments, tableId);
  }

  function getTableGuests(tableId: string) {
    return getTableGuestsHelper(assignments, guests, tableId);
  }

  function getSeatMap(tableId: string, capacity: number): (Guest | null)[] {
    return getSeatMapHelper(assignments, guests, tableId, capacity);
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
              <p className="text-[13px] text-muted flex-1">Drag tables and areas to reposition. Drag guests onto tables.</p>
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
                <button onClick={addFloorObject} className="btn-secondary btn-sm">Add Area</button>
                <button onClick={addTable} disabled={addingTable} className="btn-primary btn-sm disabled:opacity-50">{addingTable ? "Adding…" : "Add Table"}</button>
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
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  minWidth: 900,
                  minHeight: 600,
                  // Faint 40px grid as a spacing reference for placing tables.
                  backgroundImage:
                    "linear-gradient(to right, rgba(124,107,166,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,107,166,0.09) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              >
              {/* Floor-plan areas — labelled, draggable, resizable boxes
                  rendered behind the tables. */}
              {floorObjects.map((obj) => (
                <div
                  key={obj.id}
                  className="absolute select-none rounded-[10px] border-2 border-dashed border-violet/40 bg-violet/5 flex items-center justify-center"
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height,
                    cursor: draggingObject === obj.id ? "grabbing" : "grab",
                  }}
                  onMouseDown={(e) => handleObjectMouseDown(e, obj.id, obj.x, obj.y)}
                >
                  <input
                    type="text"
                    value={obj.label}
                    onChange={(e) =>
                      setFloorObjects((prev) =>
                        prev.map((o) => (o.id === obj.id ? { ...o, label: e.target.value } : o))
                      )
                    }
                    onBlur={(e) => updateFloorObject(obj.id, { label: e.target.value.trim() || "New area" })}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="Area label"
                    className="bg-transparent text-center text-[12px] font-semibold text-violet/80 border-0 px-2 w-[88%] focus:outline-none focus:bg-white/70 rounded-[6px]"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFloorObject(obj.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label={`Delete ${obj.label}`}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-border text-muted hover:text-error hover:border-error rounded-full flex items-center justify-center transition"
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <div
                    onMouseDown={(e) => handleObjectResizeMouseDown(e, obj.id)}
                    role="button"
                    aria-label={`Resize ${obj.label}`}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M11 4L4 11M11 8L8 11" stroke="var(--violet, #7C6BA6)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              ))}

              {tables.map((table) => {
                const tableGuests = getTableGuests(table.id);
                const seatMap = getSeatMap(table.id, table.capacity);
                const isFull = tableGuests.length >= table.capacity;
                const isRound = table.shape === "round";
                // Footprint: explicit size if the table has been resized,
                // otherwise the shape default.
                const tableSize = isRound ? (table.width ?? ROUND_DEFAULT_SIZE) : undefined;
                const rectWidth = table.width ?? RECT_DEFAULT_WIDTH;
                const rectHeight = table.height ?? RECT_DEFAULT_HEIGHT;

                return (
                  <div
                    key={table.id}
                    className="group/table absolute select-none"
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
                        style={{ width: rectWidth, minHeight: rectHeight }}
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
                      ref={editingTable === table.id ? editButtonRef : undefined}
                      onClick={(e) => { e.stopPropagation(); setEditingTable(editingTable === table.id ? null : table.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted hover:text-violet transition bg-white border border-border rounded-full px-2 py-0.5 z-10"
                    >
                      {editingTable === table.id ? "Done" : "Edit"}
                    </button>

                    {/* Resize handle — drag to make the table bigger or
                        smaller (round stays circular). Revealed on hover. */}
                    <div
                      onMouseDown={(e) => handleTableResizeMouseDown(e, table.id)}
                      role="button"
                      aria-label={`Resize ${table.name || `Table ${table.table_number}`}`}
                      title="Drag to resize"
                      className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover/table:opacity-100 transition-opacity flex items-end justify-end z-10"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M11 4L4 11M11 8L8 11" stroke="var(--violet, #7C6BA6)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>

                    {/* Edit popover */}
                    {editingTable === table.id && (
                      <div
                        ref={editPopoverRef}
                        className="absolute top-full left-0 mt-4 z-20 bg-white border border-border rounded-[12px] shadow-lg p-3 space-y-3 w-64 sm:w-72"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label htmlFor={`table-name-${table.id}`} className="text-[11px] font-semibold text-muted">Table Name</label>
                          <input
                            id={`table-name-${table.id}`}
                            type="text"
                            value={table.name || ""}
                            onChange={(e) => updateTable(table.id, { name: e.target.value })}
                            className="mt-0.5 w-full rounded-[8px] border-border px-2 py-1 text-[13px]"
                          />
                        </div>
                        <div role="group" aria-labelledby={`table-shape-${table.id}`}>
                          <span id={`table-shape-${table.id}`} className="text-[11px] font-semibold text-muted">Shape</span>
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
                        <div role="group" aria-labelledby={`table-seats-${table.id}`}>
                          <span id={`table-seats-${table.id}`} className="text-[11px] font-semibold text-muted">Seats</span>
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
                          <div role="group" aria-labelledby={`table-seated-${table.id}`}>
                            <span id={`table-seated-${table.id}`} className="text-[11px] font-semibold text-muted">Seated</span>
                            <div className="mt-1 space-y-2">
                              {tableGuests.map((g) => {
                                const assignment = assignments.find((a) => a.guest_id === g.id);
                                const takenSeats = new Set(
                                  getTableAssignments(table.id)
                                    .filter((a) => a.seat_number != null && a.guest_id !== g.id)
                                    .map((a) => a.seat_number)
                                );
                                return (
                                  <div key={g.id} className="rounded-[8px] bg-lavender/30 px-2.5 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[13px] text-plum font-medium truncate">{g.name}</span>
                                      <button onClick={() => unassignGuest(g.id)} className="text-muted hover:text-error text-[12px] font-medium px-1">unseat</button>
                                    </div>
                                    <div className="mt-1.5 flex gap-1 flex-wrap">
                                      {Array.from({ length: table.capacity }, (_, i) => i + 1).map((n) => {
                                        const isActive = assignment?.seat_number === n;
                                        const isTaken = takenSeats.has(n);
                                        return (
                                          <button
                                            key={n}
                                            type="button"
                                            disabled={isTaken}
                                            onClick={() => updateSeatNumber(g.id, table.id, isActive ? null : n)}
                                            className={`w-8 h-8 rounded-full text-[11px] font-semibold transition ${
                                              isActive
                                                ? "bg-violet text-white"
                                                : isTaken
                                                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                                  : "bg-white border border-border text-muted hover:border-violet hover:text-violet"
                                            }`}
                                            title={isTaken ? `Seat ${n} is taken` : isActive ? `Remove from seat ${n}` : `Assign to seat ${n}`}
                                          >
                                            {n}
                                          </button>
                                        );
                                      })}
                                    </div>
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
            <div className="space-y-1 flex-1 overflow-y-auto" role="list" aria-label="Unassigned guests — drag to a table or use the dropdown to assign">
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
                    className="text-[13px] text-violet bg-transparent border-0 cursor-pointer p-0 min-h-8"
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
              {unassignedGuests.length === 0 && guests.length > 0 && assignments.length > 0 && (
                <div className="rounded-xl bg-lavender/40 border border-violet/15 px-4 py-4 text-center space-y-1.5">
                  <p className="text-[15px] font-semibold text-plum">Everyone has a seat — your room is set.</p>
                  <p className="text-[13px] text-muted leading-relaxed">
                    This is one of the hardest parts of planning, and you just finished it.
                    {guests.length >= 50 ? ` ${guests.length} people, all accounted for.` : ""} Take a breath — you earned it.
                  </p>
                </div>
              )}
            </div>
            {/* Quick-add a guest without leaving the seating chart */}
            <form
              onSubmit={(e) => { e.preventDefault(); addGuestFromSeating(); }}
              className="mt-2 flex gap-1"
            >
              <input
                type="text"
                placeholder="Add a guest..."
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                aria-label="Add a guest"
                className="rounded-[10px] border-border px-2.5 py-1.5 text-[13px] flex-1 min-w-0"
              />
              <button type="submit" className="btn-primary btn-sm flex-shrink-0">Add</button>
            </form>
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

            {/* Quick-add couple */}
            <div className="flex gap-2 flex-wrap mb-4">
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
            </div>

            {/* Add officiant */}
            <div className="mb-4">
              <label htmlFor="ceremony-officiant" className="text-[12px] font-semibold text-muted">Officiant</label>
              <div className="mt-1 flex gap-2 flex-wrap">
                <input
                  id="ceremony-officiant"
                  type="text"
                  value={officiantName}
                  onChange={(e) => setOfficiantName(e.target.value)}
                  placeholder="Officiant name"
                  className="flex-1 min-w-[180px] rounded-[8px] border-border px-3 py-2 text-[14px]"
                />
                <button
                  onClick={() => {
                    const name = officiantName.trim();
                    if (!name) return;
                    addCeremonyPosition(name, "officiant", "center", "Officiant");
                    setOfficiantName("");
                  }}
                  disabled={!officiantName.trim()}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  Add Officiant
                </button>
              </div>
            </div>

            {/* Add to ceremony sides */}
            <div role="group" aria-labelledby="ceremony-add-person-label">
              <label id="ceremony-add-person-label" htmlFor="ceremony-add-name" className="text-[12px] font-semibold text-muted">Add a person</label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  id="ceremony-add-name"
                  type="text"
                  value={ceremonyAddName}
                  onChange={(e) => setCeremonyAddName(e.target.value)}
                  placeholder="Name"
                  aria-label="Name"
                  className="rounded-[8px] border-border px-3 py-2 text-[14px]"
                />
                <input
                  type="text"
                  value={ceremonyAddRole}
                  onChange={(e) => setCeremonyAddRole(e.target.value)}
                  placeholder="Role (e.g. Attendant, Reader)"
                  aria-label="Role"
                  className="rounded-[8px] border-border px-3 py-2 text-[14px]"
                />
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const name = ceremonyAddName.trim();
                    if (!name) return;
                    addCeremonyPosition(name, "wedding_party", "left", ceremonyAddRole.trim() || undefined);
                    setCeremonyAddName("");
                    setCeremonyAddRole("");
                  }}
                  disabled={!ceremonyAddName.trim()}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  Add to Left Side
                </button>
                <button
                  onClick={() => {
                    const name = ceremonyAddName.trim();
                    if (!name) return;
                    addCeremonyPosition(name, "wedding_party", "right", ceremonyAddRole.trim() || undefined);
                    setCeremonyAddName("");
                    setCeremonyAddRole("");
                  }}
                  disabled={!ceremonyAddName.trim()}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  Add to Right Side
                </button>
              </div>
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
