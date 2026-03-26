"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { usePremium } from "@/components/PremiumGate";
import { Tooltip } from "@/components/Tooltip";
import { trackGuestAdded, trackGuestImport } from "@/lib/analytics";

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

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  not_invited: "Save for Later",
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
  const [noWedding, setNoWedding] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status" | "role">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [venueCapacity, setVenueCapacity] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/guests").then((res) => {
        if (res.status === 404) { setNoWedding(true); return []; }
        return res.ok ? res.json() : Promise.reject();
      }),
      fetch("/api/weddings").then((r) => r.ok ? r.json() : null),
    ])
      .then(([guestData, weddingData]) => {
        setGuests(guestData);
        if (weddingData?.guest_count_estimate) {
          setVenueCapacity(weddingData.guest_count_estimate);
        }
      })
      .catch(() => toast.error("Couldn't load your guest list. Try refreshing."))
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
      trackGuestAdded();
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
      toast.error("Couldn't remove that guest. Try again.");
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Update failed (${res.status})`);
      }
    } catch (err) {
      setGuests(prev);
      toast.error(err instanceof Error ? err.message : "Changes didn't save. Try again.");
    }
  }

  function downloadTemplate() {
    const headers = ["name", "email", "role", "meal_preference", "plus_one_name", "phone", "group"];
    const example = ["Jane Doe", "jane@example.com", "friend", "Vegetarian", "John Doe", "(555) 123-4567", "College Friends"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
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
      trackGuestImport(imported);
      toast.success(`Imported ${imported} guests`);
      const reload = await fetch("/api/guests");
      if (reload.ok) setGuests(await reload.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import didn't work. Check your file format and try again.");
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
            <Text style={s.subtitle}>Eydn wedding planner</Text>
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

  const STATUS_ORDER = ["not_invited", "invite_sent", "pending", "accepted", "declined"];

  const filtered = guests.filter((g) => {
    if (filterRole && g.role !== filterRole) return false;
    if (filterStatus && g.rsvp_status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!g.name.toLowerCase().includes(q) && !(g.email?.toLowerCase().includes(q))) return false;
    }
    return true;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") return dir * a.name.localeCompare(b.name);
    if (sortBy === "status") return dir * (STATUS_ORDER.indexOf(a.rsvp_status) - STATUS_ORDER.indexOf(b.rsvp_status));
    if (sortBy === "role") return dir * (a.role || "").localeCompare(b.role || "");
    return 0;
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
      toast.error("Bulk update didn't save. Try again.");
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
      toast.error("Bulk update didn't save. Try again.");
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
      toast.error("Couldn't remove those guests. Try again.");
    }
    setSelectedGuests(new Set());
  }

  const accepted = guests.filter((g) => g.rsvp_status === "accepted").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;
  const invited = guests.filter((g) => g.rsvp_status !== "not_invited").length;
  const awaiting = guests.filter((g) => g.rsvp_status === "invite_sent" || g.rsvp_status === "pending").length;

  if (loading) {
    return <SkeletonList count={6} />;
  }

  if (noWedding) return <NoWeddingState feature="Guest List" />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Guest List <Tooltip text="Manage your wedding guests, track RSVPs, assign roles, and organize guests into groups. Use filters to quickly find specific guests." wide /></h1>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept=".csv" onChange={importCSV} aria-label="Import CSV file" className="hidden" />
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={guests.length === 0}
              aria-expanded={showExportMenu}
              aria-haspopup="menu"
              className="btn-secondary btn-sm disabled:opacity-50 inline-flex items-center gap-1"
            >
              Export
              <span className="text-[10px]">&#9662;</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" role="presentation" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 z-20 bg-white border border-border rounded-[10px] shadow-lg py-1 w-40" role="menu">
                  <button
                    onClick={() => { exportCSV(); setShowExportMenu(false); }}
                    role="menuitem"
                    className="w-full text-left px-4 py-2 text-[14px] text-plum hover:bg-lavender transition"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => { exportXLSX(); setShowExportMenu(false); }}
                    role="menuitem"
                    className="w-full text-left px-4 py-2 text-[14px] text-plum hover:bg-lavender transition"
                  >
                    Export as Excel
                  </button>
                  <button
                    onClick={() => { guardAction(() => exportPDF()); setShowExportMenu(false); }}
                    role="menuitem"
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
          <button onClick={downloadTemplate} className="btn-ghost btn-sm text-[12px]" title="Download a CSV template showing the expected format">
            Template
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4 flex-wrap items-center">
        <span className="text-[15px] text-muted">Total: <strong className="font-semibold">{guests.length}</strong>{venueCapacity ? <span className="text-[13px]"> / {venueCapacity}</span> : null}</span>
        {venueCapacity && guests.length > venueCapacity && (
          <span className="text-[12px] font-semibold text-error">Over capacity</span>
        )}
        <span className="text-[15px] text-muted">Invited: <strong className="font-semibold">{invited}</strong></span>
        <span className="badge badge-pending">Awaiting: {awaiting}</span>
        <span className="badge badge-confirmed">Accepted: {accepted}</span>
        <span className="badge badge-declined">Declined: {declined}</span>
      </div>

      {/* Filters */}
      <div className="mt-4 flex gap-3 items-center flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-border accent-violet"
          />
          <span className="text-[13px] text-muted font-medium">Select all</span>
        </label>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search guests by name or email"
            className="w-full rounded-[10px] border-border pl-8 pr-3 py-1.5 text-[15px]"
          />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} aria-label="Filter by role" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by RSVP status" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]">
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [by, dir] = e.target.value.split("-") as ["name" | "status" | "role", "asc" | "desc"];
            setSortBy(by);
            setSortDir(dir);
          }}
          aria-label="Sort guests"
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px]"
        >
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="status-asc">Status (pipeline)</option>
          <option value="status-desc">Status (reverse)</option>
          <option value="role-asc">Role A-Z</option>
          <option value="role-desc">Role Z-A</option>
        </select>
        <Tooltip text="RSVP pipeline: Save for Later → Invite Sent → Pending → Accepted or Declined. Update each guest's status as responses come in." wide />
      </div>

      {/* Add guest */}
      <form onSubmit={addGuest} className="mt-6 card overflow-hidden">
        <div className="flex gap-3 px-4 py-3">
          <input type="text" placeholder="Guest name" value={name} onChange={(e) => setName(titleCase(e.target.value))} aria-label="Guest name" className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1" required />
          <input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Guest email" className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1" />
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
                <label className="text-[12px] font-semibold text-muted">Role <Tooltip text="Categorize guests as Family, Friend, Wedding Party, Coworker, Plus One, or Other. Roles help you filter and organize your guest list." wide /></label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Meal Preference <Tooltip text="Record dietary needs or meal choices for each guest. This integrates with your catering planning to ensure accurate headcounts per meal type." wide /></label>
                <input
                  type="text"
                  value={newMeal}
                  onChange={(e) => setNewMeal(e.target.value)}
                  placeholder="e.g. Vegetarian, Gluten-free"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted">Plus One Name <Tooltip text="If this guest is bringing someone, enter their name. This also counts them toward your total headcount." /></label>
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
                <label className="text-[12px] font-semibold text-muted">Group <Tooltip text="Use groups to organize related guests together, such as family units, friend circles, or work colleagues. Groups make it easy to manage seating and send batch updates." wide /></label>
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="e.g. Partner's family, College friends"
                  className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[12px] font-semibold text-muted">Mailing Address</label>
                <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="text" value={newAddr1} onChange={(e) => setNewAddr1(e.target.value)} placeholder="Street address" aria-label="Street address" className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2" />
                  <input type="text" value={newAddr2} onChange={(e) => setNewAddr2(e.target.value)} placeholder="Apt, suite, etc." aria-label="Apartment, suite, etc." className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2" />
                  <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City" aria-label="City" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" />
                  <input type="text" value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="State" aria-label="State" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" maxLength={2} />
                  <input type="text" value={newZip} onChange={(e) => setNewZip(e.target.value)} placeholder="ZIP" aria-label="ZIP code" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" maxLength={10} />
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Guest list */}
      {filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
            <span className="w-4" />
            <span>Name</span>
            <span>Status</span>
            <span className="w-[90px]" />
            <span className="w-4" />
          </div>
          {filtered.map((guest) => {
            const isExpanded = expanded === guest.id;
            const filledCount = [guest.meal_preference, guest.phone, guest.plus_one_name, guest.group_name, guest.address_line1].filter(Boolean).length;
            const totalOptional = 5;
            const hasAllDetails = filledCount === totalOptional;

            return (
            <div
              key={guest.id}
              className={`group/guest card overflow-hidden transition-all ${isExpanded ? "ring-2 ring-violet/20" : ""}`}
            >
              {/* Main row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-lavender/20 transition"
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(isExpanded ? null : guest.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(isExpanded ? null : guest.id); } }}
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
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold border-0 cursor-pointer ${STATUS_BADGE[guest.rsvp_status] || ""}`}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>

                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : guest.id); }}
                  className="text-[12px] text-muted hover:text-violet transition"
                >
                  {isExpanded ? "Close" : "Edit"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(guest.id); }}
                  aria-label={`Remove ${guest.name}`}
                  className="opacity-0 group-hover/guest:opacity-100 transition-opacity text-muted hover:text-error"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M5 2V1.5C5 1.22386 5.22386 1 5.5 1H10.5C10.7761 1 11 1.22386 11 1.5V2M2.5 3H13.5M3.5 3V13.5C3.5 14.0523 3.94772 14.5 4.5 14.5H11.5C12.0523 14.5 12.5 14.0523 12.5 13.5V3M6.5 6V11.5M9.5 6V11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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
                    <label className="text-[12px] font-semibold text-muted">Plus One Name <Tooltip text="If this guest is bringing someone, enter their name. This also counts them toward your total headcount." /></label>
                    <input
                      type="text"
                      defaultValue={guest.plus_one_name || ""}
                      onBlur={(e) => {
                        const val = e.target.value || null;
                        updateGuest(guest.id, "plus_one_name", val);
                        updateGuest(guest.id, "plus_one", !!val);
                      }}
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
                      placeholder="e.g. Partner's family, College friends"
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
        message="This permanently removes this guest from your list."
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
        message="This permanently removes these guests from your list."
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
              aria-expanded={bulkStatusOpen}
              aria-haspopup="menu"
              className="btn-secondary btn-sm inline-flex items-center gap-1"
            >
              Change Status
              <span className="text-[10px]">&#9662;</span>
            </button>
            {bulkStatusOpen && (
              <>
                <div className="fixed inset-0 z-10" role="presentation" onClick={() => setBulkStatusOpen(false)} />
                <div className="absolute bottom-full mb-1 left-0 z-20 bg-white border border-border rounded-[10px] shadow-lg py-1 w-40" role="menu">
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => bulkChangeStatus(v)}
                      role="menuitem"
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
