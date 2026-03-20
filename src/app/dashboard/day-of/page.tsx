"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type TimelineItem = { time: string; event: string; notes: string };
type VendorContact = { vendor: string; category: string; contact: string; phone: string };
type PartyAssignment = { name: string; role: string; job: string; phone: string };
type PackingItem = { item: string; notes: string };

type DayOfPlan = {
  ceremonyTime: string;
  timeline: TimelineItem[];
  vendorContacts: VendorContact[];
  partyAssignments: PartyAssignment[];
  packingChecklist: PackingItem[];
};

type Tab = "timeline" | "vendors" | "packing";

function generateTimelineFromCeremony(ceremonyTime: string): TimelineItem[] {
  // Parse ceremony time (e.g. "4:30 PM")
  const match = ceremonyTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return [];

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  const ceremonyMinutes = hours * 60 + minutes;

  function formatTime(totalMinutes: number): string {
    let h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const p = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, "0")} ${p}`;
  }

  return [
    { time: formatTime(ceremonyMinutes - 510), event: "Hair & makeup begins", notes: "" },
    { time: formatTime(ceremonyMinutes - 390), event: "Photographer arrives", notes: "" },
    { time: formatTime(ceremonyMinutes - 330), event: "Getting ready photos", notes: "" },
    { time: formatTime(ceremonyMinutes - 270), event: "Lunch for wedding party", notes: "" },
    { time: formatTime(ceremonyMinutes - 150), event: "First look (if applicable)", notes: "" },
    { time: formatTime(ceremonyMinutes - 90), event: "Wedding party photos", notes: "" },
    { time: formatTime(ceremonyMinutes - 30), event: "Guests arrive", notes: "" },
    { time: formatTime(ceremonyMinutes), event: "Ceremony begins", notes: "" },
    { time: formatTime(ceremonyMinutes + 30), event: "Cocktail hour", notes: "" },
    { time: formatTime(ceremonyMinutes + 90), event: "Reception entrance", notes: "" },
    { time: formatTime(ceremonyMinutes + 105), event: "First dance", notes: "" },
    { time: formatTime(ceremonyMinutes + 120), event: "Dinner service", notes: "" },
    { time: formatTime(ceremonyMinutes + 180), event: "Speeches & toasts", notes: "" },
    { time: formatTime(ceremonyMinutes + 210), event: "Cake cutting", notes: "" },
    { time: formatTime(ceremonyMinutes + 225), event: "Parent dances", notes: "" },
    { time: formatTime(ceremonyMinutes + 240), event: "Open dancing", notes: "" },
    { time: formatTime(ceremonyMinutes + 360), event: "Last dance", notes: "" },
    { time: formatTime(ceremonyMinutes + 375), event: "Send-off", notes: "" },
  ];
}

export default function DayOfPage() {
  const [plan, setPlan] = useState<DayOfPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("timeline");
  const [ceremonyTime, setCeremonyTime] = useState("");
  const [newPackingItem, setNewPackingItem] = useState("");

  useEffect(() => {
    fetch("/api/day-of")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const content = data.content as DayOfPlan;
        // Migrate old string[] packing checklist to PackingItem[]
        if (content.packingChecklist && content.packingChecklist.length > 0) {
          const first = content.packingChecklist[0];
          if (typeof first === "string") {
            content.packingChecklist = (content.packingChecklist as unknown as string[]).map(
              (item) => ({ item, notes: "" })
            );
          }
        }
        setPlan(content);
        setCeremonyTime(content.ceremonyTime || "");
      })
      .catch(() => toast.error("Failed to load day-of plan"))
      .finally(() => setLoading(false));
  }, []);

  async function savePlan(updated: DayOfPlan) {
    setPlan(updated);
    await fetch("/api/day-of", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updated }),
    }).catch(() => toast.error("Failed to save"));
  }

  function updateTimeline(index: number, field: keyof TimelineItem, value: string) {
    if (!plan) return;
    const updated = [...plan.timeline];
    updated[index] = { ...updated[index], [field]: value };
    savePlan({ ...plan, timeline: updated });
  }

  function addTimelineItem() {
    if (!plan) return;
    savePlan({ ...plan, timeline: [...plan.timeline, { time: "", event: "", notes: "" }] });
  }

  function removeTimelineItem(index: number) {
    if (!plan) return;
    savePlan({ ...plan, timeline: plan.timeline.filter((_, i) => i !== index) });
  }

  function handleCeremonyTimeSet() {
    if (!plan || !ceremonyTime) return;
    const newTimeline = generateTimelineFromCeremony(ceremonyTime);
    if (newTimeline.length === 0) {
      toast.error("Enter a valid time like 4:30 PM");
      return;
    }
    savePlan({ ...plan, ceremonyTime, timeline: newTimeline });
    toast.success("Timeline generated based on ceremony time");
  }

  function updatePackingNote(index: number, notes: string) {
    if (!plan) return;
    const updated = [...plan.packingChecklist];
    updated[index] = { ...updated[index], notes };
    savePlan({ ...plan, packingChecklist: updated });
  }

  function addPackingItem() {
    if (!plan || !newPackingItem.trim()) return;
    savePlan({
      ...plan,
      packingChecklist: [...plan.packingChecklist, { item: newPackingItem.trim(), notes: "" }],
    });
    setNewPackingItem("");
  }

  function removePackingItem(index: number) {
    if (!plan) return;
    savePlan({ ...plan, packingChecklist: plan.packingChecklist.filter((_, i) => i !== index) });
  }

  function toggleCheckItem(item: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  async function exportPDF() {
    if (!plan) return;

    // Dynamic import to avoid SSR issues
    const { pdf, Document, Page: PdfPage, Text, View, StyleSheet } = await import("@react-pdf/renderer");

    const styles = StyleSheet.create({
      page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
      title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#1A1030" },
      subtitle: { fontSize: 10, color: "#5A4070", marginBottom: 20 },
      sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#8B3FCC", marginTop: 16, marginBottom: 8 },
      row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#E8D0F5" },
      timeCol: { width: 80, fontFamily: "Helvetica-Bold", color: "#8B3FCC" },
      eventCol: { flex: 1, color: "#1A1030" },
      notesCol: { width: 140, color: "#5A4070", fontSize: 9 },
      tableHeader: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#8B3FCC" },
      headerText: { fontFamily: "Helvetica-Bold", color: "#5A4070", fontSize: 9 },
      cell: { color: "#1A1030" },
      checkItem: { flexDirection: "row", paddingVertical: 3, gap: 8 },
      checkbox: { width: 10, height: 10, borderWidth: 1, borderColor: "#8B3FCC", borderRadius: 2 },
    });

    const PdfDoc = (
      <Document>
        <PdfPage size="A4" style={styles.page}>
          <Text style={styles.title}>Day-of Plan</Text>
          <Text style={styles.subtitle}>eydn wedding planner</Text>

          <Text style={styles.sectionTitle}>Timeline</Text>
          {plan.timeline.map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.timeCol}>{item.time}</Text>
              <Text style={styles.eventCol}>{item.event}</Text>
              <Text style={styles.notesCol}>{item.notes}</Text>
            </View>
          ))}

          {plan.vendorContacts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Vendor Contacts</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 120 }]}>Vendor</Text>
                <Text style={[styles.headerText, { width: 100 }]}>Category</Text>
                <Text style={[styles.headerText, { flex: 1 }]}>Contact</Text>
                <Text style={[styles.headerText, { width: 100 }]}>Phone</Text>
              </View>
              {plan.vendorContacts.map((v, i) => (
                <View key={i} style={styles.row}>
                  <Text style={[styles.cell, { width: 120, fontFamily: "Helvetica-Bold" }]}>{v.vendor}</Text>
                  <Text style={[styles.cell, { width: 100 }]}>{v.category}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{v.contact || "—"}</Text>
                  <Text style={[styles.cell, { width: 100 }]}>{v.phone || "—"}</Text>
                </View>
              ))}
            </>
          )}

          {plan.partyAssignments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Wedding Party Jobs</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 120 }]}>Name</Text>
                <Text style={[styles.headerText, { width: 100 }]}>Role</Text>
                <Text style={[styles.headerText, { flex: 1 }]}>Job</Text>
                <Text style={[styles.headerText, { width: 100 }]}>Phone</Text>
              </View>
              {plan.partyAssignments.map((p, i) => (
                <View key={i} style={styles.row}>
                  <Text style={[styles.cell, { width: 120, fontFamily: "Helvetica-Bold" }]}>{p.name}</Text>
                  <Text style={[styles.cell, { width: 100 }]}>{p.role}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{p.job || "—"}</Text>
                  <Text style={[styles.cell, { width: 100 }]}>{p.phone || "—"}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Packing Checklist</Text>
          {plan.packingChecklist.map((p, i) => (
            <View key={i} style={styles.checkItem}>
              <View style={styles.checkbox} />
              <Text style={styles.cell}>{p.item}</Text>
              {p.notes && <Text style={[styles.notesCol, { fontSize: 8 }]}>({p.notes})</Text>}
            </View>
          ))}
        </PdfPage>
      </Document>
    );

    const blob = await pdf(PdfDoc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "day-of-plan.pdf";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded");
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  if (!plan) {
    return (
      <div>
        <h1>Day-of Planner</h1>
        <p className="mt-2 text-[15px] text-muted">
          Your day-of plan will be auto-generated 2 weeks before the wedding.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1>Day-of Planner</h1>
        <button onClick={exportPDF} className="btn-primary btn-sm">
          Export PDF
        </button>
      </div>
      <p className="mt-1 text-[15px] text-muted">
        Your complete wedding day plan. Click any field to edit.
      </p>

      {/* Ceremony time */}
      <div className="mt-4 card p-4 flex items-center gap-3">
        <label className="text-[13px] font-semibold text-plum whitespace-nowrap">Ceremony time:</label>
        <input
          type="text"
          value={ceremonyTime}
          onChange={(e) => setCeremonyTime(e.target.value)}
          placeholder="e.g. 4:30 PM"
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px] w-32"
        />
        <button onClick={handleCeremonyTimeSet} className="btn-secondary btn-sm">
          Generate Timeline
        </button>
        <p className="text-[12px] text-muted">Sets all times working backwards from your ceremony</p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {(["timeline", "vendors", "packing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition ${
              tab === t
                ? "border-violet text-violet"
                : "border-transparent text-muted hover:text-plum"
            }`}
          >
            {t === "timeline" ? "Timeline" : t === "vendors" ? "Vendors & Party" : "Packing Checklist"}
          </button>
        ))}
      </div>

      {/* TIMELINE TAB */}
      {tab === "timeline" && (
        <div className="mt-4">
          <div className="space-y-1">
            {plan.timeline.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[12px] border border-border bg-white px-4 py-2"
              >
                <input
                  type="text"
                  defaultValue={item.time}
                  onBlur={(e) => updateTimeline(i, "time", e.target.value)}
                  className="w-24 text-[15px] font-semibold text-violet border-0 bg-transparent"
                  placeholder="Time"
                />
                <input
                  type="text"
                  defaultValue={item.event}
                  onBlur={(e) => updateTimeline(i, "event", e.target.value)}
                  className="flex-1 text-[15px] text-plum border-0 bg-transparent"
                  placeholder="Event"
                />
                <input
                  type="text"
                  defaultValue={item.notes}
                  onBlur={(e) => updateTimeline(i, "notes", e.target.value)}
                  placeholder="Notes"
                  className="w-40 text-[12px] text-muted border-0 bg-transparent"
                />
                <button
                  onClick={() => removeTimelineItem(i)}
                  className="text-[10px] text-error hover:opacity-80 flex-shrink-0"
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <button onClick={addTimelineItem} className="btn-ghost btn-sm mt-3">
            Add event
          </button>
        </div>
      )}

      {/* VENDORS TAB */}
      {tab === "vendors" && (
        <div className="mt-4 space-y-6">
          {plan.vendorContacts.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-plum mb-3">Vendor Contacts</h2>
              <div className="overflow-hidden rounded-[16px] border border-border bg-white">
                <table className="w-full text-[15px]">
                  <thead className="border-b border-border bg-lavender">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Vendor</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Category</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Contact</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plan.vendorContacts.map((v, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-semibold text-plum">{v.vendor}</td>
                        <td className="px-4 py-2 text-muted">{v.category}</td>
                        <td className="px-4 py-2 text-muted">{v.contact || "—"}</td>
                        <td className="px-4 py-2 text-muted">{v.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {plan.partyAssignments.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-plum mb-3">Wedding Party Jobs</h2>
              <div className="overflow-hidden rounded-[16px] border border-border bg-white">
                <table className="w-full text-[15px]">
                  <thead className="border-b border-border bg-lavender">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Role</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Job</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plan.partyAssignments.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-semibold text-plum">{p.name}</td>
                        <td className="px-4 py-2 text-muted">{p.role}</td>
                        <td className="px-4 py-2 text-muted">{p.job || "—"}</td>
                        <td className="px-4 py-2 text-muted">{p.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {plan.vendorContacts.length === 0 && plan.partyAssignments.length === 0 && (
            <p className="text-[15px] text-muted text-center py-8">
              Add vendors and wedding party members to see them here.
            </p>
          )}
        </div>
      )}

      {/* PACKING CHECKLIST TAB */}
      {tab === "packing" && (
        <div className="mt-4">
          <div className="space-y-2">
            {plan.packingChecklist.map((p, i) => (
              <div
                key={i}
                className="card flex items-start gap-3 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={checkedItems.has(p.item)}
                  onChange={() => toggleCheckItem(p.item)}
                  className="accent-violet mt-1 flex-shrink-0"
                />
                <div className="flex-1">
                  <span
                    className={`text-[15px] ${
                      checkedItems.has(p.item) ? "text-muted line-through" : "text-plum"
                    }`}
                  >
                    {p.item}
                  </span>
                  <input
                    type="text"
                    defaultValue={p.notes}
                    onBlur={(e) => updatePackingNote(i, e.target.value)}
                    placeholder="Add a note..."
                    className="block w-full mt-1 text-[12px] text-muted border-0 bg-transparent outline-none"
                  />
                </div>
                <button
                  onClick={() => removePackingItem(i)}
                  className="text-[10px] text-error hover:opacity-80 flex-shrink-0 mt-1"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); addPackingItem(); }}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              value={newPackingItem}
              onChange={(e) => setNewPackingItem(e.target.value)}
              placeholder="Add an item..."
              className="rounded-[10px] border-border px-3 py-1.5 text-[15px] flex-1"
            />
            <button type="submit" className="btn-secondary btn-sm">Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
