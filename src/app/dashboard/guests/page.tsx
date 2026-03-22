"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { usePremium } from "@/components/PremiumGate";

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
  const [newRole, setNewRole] = useState("friend");
  const [newPhone, setNewPhone] = useState("");
  const [newMeal, setNewMeal] = useState("");
  const [newPlusOne, setNewPlusOne] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newAddr1, setNewAddr1] = useState("");
  const [newAddr2, setNewAddr2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
  const [showAddFields, setShowAddFields] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
      meal_preference: newMeal.trim() || null,
      role: newRole || "friend",
      plus_one: !!newPlusOne.trim(),
      plus_one_name: newPlusOne.trim() || null,
      address_line1: newAddr1.trim() || null,
      address_line2: newAddr2.trim() || null,
      city: newCity.trim() || null,
      state: newState.trim() || null,
      zip: newZip.trim() || null,
      phone: newPhone.trim() || null,
      group_name: newGroup.trim() || null,
    };

    setGuests((prev) => [...prev, newGuest]);
    setName("");
    setEmail("");
    setNewRole("friend");
    setNewPhone("");
    setNewMeal("");
    setNewPlusOne("");
    setNewGroup("");
    setNewAddr1("");
    setNewAddr2("");
    setNewCity("");
    setNewState("");
    setNewZip("");
    setShowAddFields(false);

    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGuest.name,
          email: newGuest.email,
          rsvp_status: "not_invited",
          role: newGuest.role,
          meal_preference: newGuest.meal_preference,
          plus_one: newGuest.plus_one,
          plus_one_name: newGuest.plus_one_name,
          phone: newGuest.phone,
          group_name: newGuest.group_name,
          address_line1: newGuest.address_line1,
          address_line2: newGuest.address_line2,
          city: newGuest.city,
          state: newGuest.state,
          zip: newGuest.zip,
        }),
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

  const EXPORT_HEADERS = ["Name", "Email", "RSVP Status", "Role", "Meal Preference", "Plus One Name", "Phone", "Group", "Address Line 1", "Address Line 2", "City", "State", "ZIP"];

  function getExportRows() {
    return guests.map((g) => [
      g.name,
      g.email || "",
      STATUS_LABELS[g.rsvp_status] || g.rsvp_status,
      g.role ? (ROLE_LABELS[g.role] || g.role) : "",
      g.meal_preference || "",
      g.plus_one_name || "",
      g.phone || "",
      g.group_name || "",
      g.address_line1 || "",
      g.address_line2 || "",
      g.city || "",
      g.state || "",
      g.zip || "",
    ]);
  }

  function exportCSV() {
    if (guests.length === 0) return;
    const csv = [EXPORT_HEADERS, ...getExportRows()]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Guest list exported as CSV");
  }

  async function exportXLSX() {
    if (guests.length === 0) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Guest List");

    // Header row with styling
    ws.addRow(EXPORT_HEADERS);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0E0FF" } };
    });

    // Data rows
    const rows = getExportRows();
    for (const row of rows) ws.addRow(row);

    // Auto-size columns
    ws.columns.forEach((col, i) => {
      const maxLen = Math.max(EXPORT_HEADERS[i].length, ...rows.map((r) => String(r[i]).length));
      col.width = maxLen + 3;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Guest list exported as Excel");
  }

  async function exportPDF() {
    if (guests.length === 0) return;
    const { pdf, Document, Page: PdfPage, Text, View, StyleSheet } = await import("@react-pdf/renderer");

    const brand = { violet: "#2C3E2D", plum: "#1A1A2E", muted: "#6B6B6B", lavender: "#EDE7DF", border: "#E8D5B7", blush: "#D4A5A5" };

    const s = StyleSheet.create({
      page: { fontFamily: "Helvetica", fontSize: 9, color: brand.plum, padding: 36 },
      header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
      title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: brand.plum },
      subtitle: { fontSize: 9, color: brand.muted },
      statsRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
      stat: { fontSize: 9, color: brand.muted },
      statBold: { fontFamily: "Helvetica-Bold", color: brand.plum },
      table: { borderWidth: 0.5, borderColor: brand.border, borderRadius: 4, overflow: "hidden" },
      headerRow: { flexDirection: "row", backgroundColor: brand.lavender, paddingVertical: 5, paddingHorizontal: 6 },
      headerCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: brand.muted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
      row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: brand.border },
      rowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: brand.border, backgroundColor: "#FDFAFF" },
      cell: { fontSize: 8, color: brand.plum },
      cellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.plum },
      footer: { position: "absolute", bottom: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between" },
      footerText: { fontSize: 7, color: brand.muted },
      footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: brand.violet },
    });

    // Columns: Name, Email, RSVP, Role, Meal, Phone, Group
    const cols = [
      { label: "Name", width: 80 },
      { label: "Email", width: 100 },
      { label: "RSVP", width: 55 },
      { label: "Role", width: 55 },
      { label: "Meal", width: 60 },
      { label: "Phone", width: 70 },
      { label: "Group", width: 60 },
    ];

    const PdfDoc = (
      <Document>
        <PdfPage size="A4" orientation="landscape" style={s.page}>
          <View style={s.header}>
            <Text style={s.title}>Guest List</Text>
            <Text style={s.subtitle}>eydn wedding planner</Text>
          </View>
          <View style={s.statsRow}>
            <Text style={s.stat}>Total: <Text style={s.statBold}>{guests.length}</Text></Text>
            <Text style={s.stat}>Accepted: <Text style={s.statBold}>{guests.filter((g) => g.rsvp_status === "accepted").length}</Text></Text>
            <Text style={s.stat}>Declined: <Text style={s.statBold}>{guests.filter((g) => g.rsvp_status === "declined").length}</Text></Text>
          </View>
          <View style={s.table}>
            <View style={s.headerRow}>
              {cols.map((c) => (
                <Text key={c.label} style={[s.headerCell, { width: c.width }]}>{c.label}</Text>
              ))}
            </View>
            {guests.map((g, i) => (
              <View key={g.id} style={i % 2 === 1 ? s.rowAlt : s.row}>
                <Text style={[s.cellBold, { width: cols[0].width }]}>{g.name}</Text>
                <Text style={[s.cell, { width: cols[1].width }]}>{g.email || "\u2014"}</Text>
                <Text style={[s.cell, { width: cols[2].width }]}>{STATUS_LABELS[g.rsvp_status]}</Text>
                <Text style={[s.cell, { width: cols[3].width }]}>{g.role ? (ROLE_LABELS[g.role] || g.role) : "\u2014"}</Text>
                <Text style={[s.cell, { width: cols[4].width }]}>{g.meal_preference || "\u2014"}</Text>
                <Text style={[s.cell, { width: cols[5].width }]}>{g.phone || "\u2014"}</Text>
                <Text style={[s.cell, { width: cols[6].width }]}>{g.group_name || "\u2014"}</Text>
              </View>
            ))}
          </View>
          <View style={s.footer} fixed>
            <Text style={s.footerText}>{guests.length} guests</Text>
            <Text style={s.footerBrand}>eydn.app</Text>
          </View>
        </PdfPage>
      </Document>
    );

    const blob = await pdf(PdfDoc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list.pdf";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Guest list exported as PDF");
  }

  const [showExportMenu, setShowExportMenu] = useState(false);
  const { guardAction } = usePremium();
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkGroupValue, setBulkGroupValue] = useState("");
  const [showBulkGroupInput, setShowBulkGroupInput] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const filtered = guests.filter((g) => {
    if (filterRole && g.role !== filterRole) return false;
    if (filterStatus && g.rsvp_status !== filterStatus) return false;
    return true;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((g) => selectedGuests.has(g.id));
  const someSelected = selectedGuests.size > 0;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filtered.map((g) => g.id)));
    }
  }

  function toggleSelectGuest(id: string) {
    setSelectedGuests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkChangeStatus(status: string) {
    const ids = [...selectedGuests];
    const prev = guests;
    setGuests((g) =>
      g.map((x) => (selectedGuests.has(x.id) ? { ...x, rsvp_status: status as Guest["rsvp_status"] } : x))
    );
    setBulkStatusOpen(false);

    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/guests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rsvp_status: status }),
        });
        if (!res.ok) throw new Error();
        successCount++;
      } catch {
        // continue with others
      }
    }

    if (successCount === ids.length) {
      toast.success(`Updated status for ${successCount} guests`);
    } else if (successCount > 0) {
      toast.success(`Updated ${successCount} of ${ids.length} guests`);
    } else {
      setGuests(prev);
      toast.error("Failed to update guests");
    }
    setSelectedGuests(new Set());
  }

  async function bulkChangeGroup() {
    const ids = [...selectedGuests];
    const groupVal = bulkGroupValue.trim() || null;
    const prev = guests;
    setGuests((g) =>
      g.map((x) => (selectedGuests.has(x.id) ? { ...x, group_name: groupVal } : x))
    );
    setShowBulkGroupInput(false);
    setBulkGroupValue("");

    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/guests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_name: groupVal }),
        });
        if (!res.ok) throw new Error();
        successCount++;
      } catch {
        // continue
      }
    }

    if (successCount === ids.length) {
      toast.success(`Updated group for ${successCount} guests`);
    } else if (successCount > 0) {
      toast.success(`Updated ${successCount} of ${ids.length} guests`);
    } else {
      setGuests(prev);
      toast.error("Failed to update guests");
    }
    setSelectedGuests(new Set());
  }

  async function bulkDelete() {
    const ids = [...selectedGuests];
    const prev = guests;
    setGuests((g) => g.filter((x) => !selectedGuests.has(x.id)));
    setConfirmBulkDelete(false);

    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        successCount++;
      } catch {
        // continue
      }
    }

    if (successCount === ids.length) {
      toast.success(`Removed ${successCount} guests`);
    } else if (successCount > 0) {
      toast.success(`Removed ${successCount} of ${ids.length} guests`);
      // Reload to get accurate state
      const reload = await fetch("/api/guests");
      if (reload.ok) setGuests(await reload.json());
    } else {
      setGuests(prev);
      toast.error("Failed to remove guests");
    }
    setSelectedGuests(new Set());
  }

  const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const invited = guests.filter((g) => g.rsvp_status !== "not_invited").length;

  if (loading) {
    return <SkeletonList count={6} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Guest List</h1>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept=".csv" onChange={importCSV} className="hidden" />
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={guests.length === 0}
              className="btn-secondary btn-sm disabled:opacity-50 inline-flex items-center gap-1"
            >
              Export
              <span className="text-[10px]">&#9662;</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 z-20 bg-white border border-border rounded-[10px] shadow-lg py-1 w-40">
                  <button
                    onClick={() => { exportCSV(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[14px] text-plum hover:bg-lavender transition"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => { exportXLSX(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[14px] text-plum hover:bg-lavender transition"
                  >
                    Export as Excel
                  </button>
                  <button
                    onClick={() => { guardAction(() => exportPDF()); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[14px] text-plum hover:bg-lavender transition"
                  >
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>
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
      <div className="mt-4 flex gap-3 items-center">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-border accent-violet"
          />
          <span className="text-[13px] text-muted font-medium">Select all</span>
        </label>
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
      <form onSubmit={addGuest} className="mt-6 card overflow-hidden">
        <div className="flex gap-3 px-4 py-3">
          <input type="text" placeholder="Guest name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1" required />
          <input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1" />
          <button
            type="button"
            onClick={() => setShowAddFields(!showAddFields)}
            className={`text-[12px] font-semibold px-3 py-1 rounded-full transition ${
              showAddFields ? "bg-violet text-white" : "bg-lavender text-violet hover:bg-violet hover:text-white"
            }`}
          >
            {showAddFields ? "Less" : "More Details"}
          </button>
          <button type="submit" className="btn-primary">Add Guest</button>
        </div>

        {showAddFields && (
          <div className="border-t border-border px-4 py-4 bg-lavender/20">
            <p className="text-[12px] text-violet font-semibold mb-3">
              Optional &mdash; you can also add these later
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-[12px] font-semibold text-muted">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Meal Preference</label>
                <input
                  type="text"
                  value={newMeal}
                  onChange={(e) => setNewMeal(e.target.value)}
                  placeholder="e.g. Vegetarian, Gluten-free"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Plus One Name</label>
                <input
                  type="text"
                  value={newPlusOne}
                  onChange={(e) => setNewPlusOne(e.target.value)}
                  placeholder="Their guest's name"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Phone</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Group</label>
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="e.g. Bride's family, College friends"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[12px] font-semibold text-muted">Mailing Address</label>
                <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="text" value={newAddr1} onChange={(e) => setNewAddr1(e.target.value)} placeholder="Street address" className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2" />
                  <input type="text" value={newAddr2} onChange={(e) => setNewAddr2(e.target.value)} placeholder="Apt, suite, etc." className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2" />
                  <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" />
                  <input type="text" value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="State" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" maxLength={2} />
                  <input type="text" value={newZip} onChange={(e) => setNewZip(e.target.value)} placeholder="ZIP" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" maxLength={10} />
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Guest list */}
      {filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((guest) => {
            const isExpanded = expanded === guest.id;
            const filledCount = [guest.meal_preference, guest.phone, guest.plus_one_name, guest.group_name, guest.address_line1].filter(Boolean).length;
            const totalOptional = 5;
            const hasAllDetails = filledCount === totalOptional;

            return (
            <div
              key={guest.id}
              className={`card overflow-hidden transition-all ${isExpanded ? "ring-2 ring-violet/20" : ""}`}
            >
              {/* Main row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-lavender/20 transition"
                onClick={() => setExpanded(isExpanded ? null : guest.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedGuests.has(guest.id)}
                  onChange={() => toggleSelectGuest(guest.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-border accent-violet flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-plum">{guest.name}</span>
                    {guest.role && (
                      <span className="badge">{ROLE_LABELS[guest.role] || guest.role}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {guest.email && <span className="text-[12px] text-muted truncate">{guest.email}</span>}
                    {!isExpanded && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        hasAllDetails
                          ? "bg-[#D6F5E3] text-[#2E7D4F]"
                          : filledCount > 0
                          ? "bg-[#FFF3CC] text-[#8A5200]"
                          : "bg-lavender text-violet"
                      }`}>
                        {hasAllDetails ? "Complete" : `${filledCount}/${totalOptional} details`}
                      </span>
                    )}
                  </div>
                </div>

                <select
                  value={guest.rsvp_status}
                  onChange={(e) => { e.stopPropagation(); updateGuest(guest.id, "rsvp_status", e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className={`rounded-full px-2 py-0.5 text-[12px] font-semibold border-0 ${STATUS_BADGE[guest.rsvp_status] || ""}`}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>

                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : guest.id); }}
                  className={`text-[12px] font-semibold px-3 py-1 rounded-full transition ${
                    isExpanded
                      ? "bg-violet text-white"
                      : "bg-lavender text-violet hover:bg-violet hover:text-white"
                  }`}
                >
                  {isExpanded ? "Close" : "Edit Details"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(guest.id); }}
                  className="text-[12px] text-error hover:opacity-80"
                >
                  Remove
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 bg-lavender/20">
                  <p className="text-[12px] text-violet font-semibold mb-3">
                    Guest Details &mdash; fill in as much as you&apos;d like
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Role</label>
                    <select
                      value={guest.role || "friend"}
                      onChange={(e) => updateGuest(guest.id, "role", e.target.value)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Meal Preference</label>
                    <input
                      type="text"
                      defaultValue={guest.meal_preference || ""}
                      onBlur={(e) => updateGuest(guest.id, "meal_preference", e.target.value || null)}
                      placeholder="e.g. Vegetarian, Gluten-free"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Plus One Name</label>
                    <input
                      type="text"
                      defaultValue={guest.plus_one_name || ""}
                      onBlur={(e) => updateGuest(guest.id, "plus_one_name", e.target.value || null)}
                      placeholder="Their guest's name"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Phone</label>
                    <input
                      type="tel"
                      defaultValue={guest.phone || ""}
                      onBlur={(e) => updateGuest(guest.id, "phone", e.target.value || null)}
                      placeholder="(555) 123-4567"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Group</label>
                    <input
                      type="text"
                      defaultValue={guest.group_name || ""}
                      onBlur={(e) => updateGuest(guest.id, "group_name", e.target.value || null)}
                      placeholder="e.g. Bride's family, College friends"
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[12px] font-semibold text-muted">Mailing Address</label>
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
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && guests.length > 0 && (
        <p className="text-[15px] text-muted text-center py-8">No guests match your filters.</p>
      )}
      {guests.length === 0 && (
        <EmptyState
          icon="👥"
          title="No guests yet"
          message="Add your first guest above to start building your list."
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove guest?"
        message="This guest will be permanently removed from your guest list. This action cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmDelete) removeGuest(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedGuests.size} guests?`}
        message="These guests will be permanently removed from your guest list. This action cannot be undone."
        confirmLabel="Delete All"
        onConfirm={bulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white rounded-[16px] shadow-2xl border border-border px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[14px] font-semibold text-plum">
            {selectedGuests.size} selected
          </span>

          <div className="w-px h-6 bg-border" />

          {/* Change Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              Change Status
              <span className="text-[10px]">&#9662;</span>
            </button>
            {bulkStatusOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setBulkStatusOpen(false)} />
                <div className="absolute bottom-full mb-1 left-0 z-20 bg-white border border-border rounded-[10px] shadow-lg py-1 w-40">
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => bulkChangeStatus(v)}
                      className="w-full text-left px-4 py-2 text-[14px] text-plum hover:bg-lavender transition"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Change Group */}
          <div className="relative">
            {showBulkGroupInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bulkGroupValue}
                  onChange={(e) => setBulkGroupValue(e.target.value)}
                  placeholder="Group name"
                  className="rounded-[10px] border-border px-3 py-1 text-[14px] w-40"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") bulkChangeGroup();
                    if (e.key === "Escape") setShowBulkGroupInput(false);
                  }}
                />
                <button onClick={bulkChangeGroup} className="btn-primary btn-sm">
                  Apply
                </button>
                <button onClick={() => setShowBulkGroupInput(false)} className="btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBulkGroupInput(true)}
                className="btn-secondary btn-sm"
              >
                Change Group
              </button>
            )}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Delete Selected */}
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="rounded-[10px] bg-error text-white px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition"
          >
            Delete Selected
          </button>

          {/* Clear Selection */}
          <button
            onClick={() => setSelectedGuests(new Set())}
            className="btn-ghost btn-sm"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}
