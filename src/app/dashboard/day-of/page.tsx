"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { PremiumButton } from "@/components/PremiumGate";

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

function parseCeremonyTime(input: string): number | null {
  const trimmed = input.trim();

  // Try "4:30 PM", "4:30PM", "4:30 pm", "4:30pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const p = match12[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  // Try "4 PM", "4PM", "4 pm"
  const matchHourOnly = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (matchHourOnly) {
    let h = parseInt(matchHourOnly[1]);
    const p = matchHourOnly[2].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60;
  }

  // Try 24-hour "16:30", "09:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1]);
    const m = parseInt(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return h * 60 + m;
    }
  }

  // Try HTML time input "16:30" (same as above but also handles leading zeros)
  return null;
}

function generateTimelineFromCeremony(ceremonyTime: string): TimelineItem[] {
  const ceremonyMinutes = parseCeremonyTime(ceremonyTime);
  if (ceremonyMinutes === null) return [];

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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.content) return;
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
      .catch(() => {})
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

    const { pdf, Document, Page: PdfPage, Text, View, StyleSheet, Svg, Rect, Defs, LinearGradient, Stop, Circle } = await import("@react-pdf/renderer");

    // eydn brand colors
    const brand = {
      violet: "#8B3FCC",
      softViolet: "#B06EE0",
      blush: "#F0609A",
      petal: "#F7C8E0",
      lavender: "#F0E0FF",
      whisper: "#FBF6FF",
      plum: "#1A1030",
      muted: "#5A4070",
      border: "#E8D0F5",
      white: "#FFFFFF",
    };

    const s = StyleSheet.create({
      page: { fontFamily: "Helvetica", fontSize: 10, color: brand.plum, backgroundColor: brand.white },
      // Header banner
      headerBanner: { height: 100, position: "relative", overflow: "hidden" },
      headerContent: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 44, justifyContent: "center" },
      logoText: { fontSize: 28, fontFamily: "Helvetica-Bold", color: brand.white, letterSpacing: 2 },
      tagline: { fontSize: 9, color: brand.white, opacity: 0.85, marginTop: 2, letterSpacing: 0.5 },
      // Body
      body: { paddingHorizontal: 44, paddingTop: 28, paddingBottom: 40 },
      pageTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: brand.plum, marginBottom: 2 },
      pageSubtitle: { fontSize: 10, color: brand.muted, marginBottom: 24 },
      // Section
      sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 10, gap: 8 },
      sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.violet },
      sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: brand.violet, textTransform: "uppercase" as const, letterSpacing: 1.5 },
      sectionDivider: { height: 1, backgroundColor: brand.border, marginBottom: 10 },
      // Timeline
      timelineRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
      timelineDotCol: { width: 20, alignItems: "center", paddingTop: 5 },
      timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.petal },
      timelineTimeCol: { width: 75, paddingVertical: 6, paddingRight: 8 },
      timelineTime: { fontSize: 10, fontFamily: "Helvetica-Bold", color: brand.violet },
      timelineEventCol: { flex: 1, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: brand.border },
      timelineEvent: { fontSize: 10, color: brand.plum },
      timelineNotes: { fontSize: 8, color: brand.muted, marginTop: 2 },
      // Table
      tableContainer: { borderRadius: 6, borderWidth: 0.5, borderColor: brand.border, overflow: "hidden" },
      tableHeaderRow: { flexDirection: "row", backgroundColor: brand.lavender, paddingVertical: 6, paddingHorizontal: 10 },
      tableHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.muted, textTransform: "uppercase" as const, letterSpacing: 0.8 },
      tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: brand.border },
      tableRowAlt: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: brand.border, backgroundColor: brand.whisper },
      tableCell: { fontSize: 10, color: brand.plum },
      tableCellBold: { fontSize: 10, fontFamily: "Helvetica-Bold", color: brand.plum },
      tableCellMuted: { fontSize: 10, color: brand.muted },
      // Packing
      checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 10 },
      checkbox: { width: 12, height: 12, borderRadius: 2, borderWidth: 1.5, borderColor: brand.violet },
      checkLabel: { fontSize: 10, color: brand.plum, flex: 1 },
      checkNotes: { fontSize: 8, color: brand.muted },
      // Footer
      footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 44, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: brand.border },
      footerText: { fontSize: 7, color: brand.muted },
      footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: brand.violet },
      // Eydn message
      edynRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 20, marginTop: 4 },
      edynBubble: { backgroundColor: brand.lavender, borderRadius: 10, borderTopLeftRadius: 2, paddingHorizontal: 14, paddingVertical: 10, flex: 1 },
      edynText: { fontSize: 9, color: brand.muted, lineHeight: 1.5 },
    });

    const GradientBanner = () => (
      <View style={s.headerBanner}>
        <Svg width="595" height="100" viewBox="0 0 595 100">
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="595" y2="100">
              <Stop offset="0%" stopColor={brand.violet} />
              <Stop offset="100%" stopColor={brand.blush} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="595" height="100" fill="url(#grad)" />
          <Circle cx="520" cy="-20" r="80" fill={brand.softViolet} opacity="0.2" />
          <Circle cx="60" cy="90" r="50" fill={brand.blush} opacity="0.15" />
        </Svg>
        <View style={s.headerContent}>
          <Text style={s.logoText}>eydn</Text>
          <Text style={s.tagline}>Your AI Wedding Planning Guide</Text>
        </View>
      </View>
    );

    const SectionHeader = ({ title }: { title: string }) => (
      <>
        <View style={s.sectionHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionTitle}>{title}</Text>
        </View>
        <View style={s.sectionDivider} />
      </>
    );

    const PdfDoc = (
      <Document>
        {/* PAGE 1 — Timeline */}
        <PdfPage size="A4" style={s.page}>
          <GradientBanner />
          <View style={s.body}>
            <Text style={s.pageTitle}>Your Day-of Plan</Text>
            <Text style={s.pageSubtitle}>
              {plan.ceremonyTime ? `Ceremony at ${plan.ceremonyTime}` : "Everything you need for the big day"}
            </Text>

            {/* Eydn message */}
            <View style={s.edynRow}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.white }}>e</Text>
              </View>
              <View style={s.edynBubble}>
                <Text style={s.edynText}>
                  You&apos;ve got this! Here&apos;s your complete day-of timeline. Share this with your wedding party and coordinator so everyone knows the plan.
                </Text>
              </View>
            </View>

            <SectionHeader title="Timeline" />
            {plan.timeline.map((item, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={s.timelineDotCol}>
                  <View style={[s.timelineDot, i === 0 ? { backgroundColor: brand.violet } : {}]} />
                </View>
                <View style={s.timelineTimeCol}>
                  <Text style={s.timelineTime}>{item.time}</Text>
                </View>
                <View style={s.timelineEventCol}>
                  <Text style={s.timelineEvent}>{item.event}</Text>
                  {item.notes ? <Text style={s.timelineNotes}>{item.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
          <View style={s.footer} fixed>
            <Text style={s.footerText}>Generated by eydn</Text>
            <Text style={s.footerBrand}>eydn.app</Text>
          </View>
        </PdfPage>

        {/* PAGE 2 — Vendors, Party, Packing */}
        <PdfPage size="A4" style={s.page}>
          <View style={{ height: 6, backgroundColor: brand.violet }} />
          <View style={s.body}>
            {/* Vendor Contacts */}
            {plan.vendorContacts.length > 0 && (
              <>
                <SectionHeader title="Vendor Contacts" />
                <View style={s.tableContainer}>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderCell, { width: 130 }]}>Vendor</Text>
                    <Text style={[s.tableHeaderCell, { width: 100 }]}>Category</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1 }]}>Contact</Text>
                    <Text style={[s.tableHeaderCell, { width: 100 }]}>Phone</Text>
                  </View>
                  {plan.vendorContacts.map((v, i) => (
                    <View key={i} style={i % 2 === 1 ? s.tableRowAlt : s.tableRow}>
                      <Text style={[s.tableCellBold, { width: 130 }]}>{v.vendor}</Text>
                      <Text style={[s.tableCellMuted, { width: 100 }]}>{v.category}</Text>
                      <Text style={[s.tableCell, { flex: 1 }]}>{v.contact || "\u2014"}</Text>
                      <Text style={[s.tableCell, { width: 100 }]}>{v.phone || "\u2014"}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Wedding Party Jobs */}
            {plan.partyAssignments.length > 0 && (
              <>
                <SectionHeader title="Wedding Party Jobs" />
                <View style={s.tableContainer}>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderCell, { width: 130 }]}>Name</Text>
                    <Text style={[s.tableHeaderCell, { width: 100 }]}>Role</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1 }]}>Assignment</Text>
                    <Text style={[s.tableHeaderCell, { width: 100 }]}>Phone</Text>
                  </View>
                  {plan.partyAssignments.map((p, i) => (
                    <View key={i} style={i % 2 === 1 ? s.tableRowAlt : s.tableRow}>
                      <Text style={[s.tableCellBold, { width: 130 }]}>{p.name}</Text>
                      <Text style={[s.tableCellMuted, { width: 100 }]}>{p.role}</Text>
                      <Text style={[s.tableCell, { flex: 1 }]}>{p.job || "\u2014"}</Text>
                      <Text style={[s.tableCell, { width: 100 }]}>{p.phone || "\u2014"}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Packing Checklist */}
            <SectionHeader title="Packing Checklist" />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {plan.packingChecklist.map((p, i) => (
                <View key={i} style={[s.checkRow, { width: "50%" }]}>
                  <View style={s.checkbox} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.checkLabel}>{p.item}</Text>
                    {p.notes ? <Text style={s.checkNotes}>{p.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>

            {/* Eydn closing message */}
            <View style={[s.edynRow, { marginTop: 28 }]}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.white }}>e</Text>
              </View>
              <View style={s.edynBubble}>
                <Text style={s.edynText}>
                  Take a deep breath &mdash; you&apos;ve planned an incredible day. Trust the plan, lean on your people, and enjoy every single moment. You deserve it!
                </Text>
              </View>
            </View>
          </View>
          <View style={s.footer} fixed>
            <Text style={s.footerText}>Generated by eydn</Text>
            <Text style={s.footerBrand}>eydn.app</Text>
          </View>
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
    return <SkeletonList count={5} />;
  }

  if (!plan) {
    return (
      <div className="max-w-3xl">
        <h1>Day-of Planner</h1>
        <p className="mt-2 text-[15px] text-muted">
          Generate your day-of timeline, vendor contact sheet, and packing checklist.
        </p>
        <div className="mt-6 card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-[13px] font-semibold text-plum whitespace-nowrap">Ceremony time:</label>
            <input
              type="time"
              value={ceremonyTime}
              onChange={(e) => setCeremonyTime(e.target.value)}
              className="rounded-[10px] border-border px-3 py-1.5 text-[15px] w-36"
            />
          </div>
          <button
            onClick={async () => {
              // Validate ceremony time if provided
              let customTimeline: TimelineItem[] | null = null;
              if (ceremonyTime.trim()) {
                customTimeline = generateTimelineFromCeremony(ceremonyTime);
                if (customTimeline.length === 0) {
                  toast.error("Enter a valid time like 4:30 PM");
                  return;
                }
              }
              // Fetch/generate the plan from the API
              try {
                const res = await fetch("/api/day-of");
                if (!res.ok) throw new Error();
                const data = await res.json();
                const content = data.content as DayOfPlan;
                if (content.packingChecklist && content.packingChecklist.length > 0) {
                  const first = content.packingChecklist[0];
                  if (typeof first === "string") {
                    content.packingChecklist = (content.packingChecklist as unknown as string[]).map(
                      (item) => ({ item, notes: "" })
                    );
                  }
                }
                // Apply custom ceremony time if provided
                if (customTimeline && ceremonyTime.trim()) {
                  content.ceremonyTime = ceremonyTime;
                  content.timeline = customTimeline;
                  // Save updated plan
                  await fetch("/api/day-of", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content }),
                  });
                }
                setPlan(content);
                setCeremonyTime(content.ceremonyTime || ceremonyTime);
                toast.success("Day-of plan generated!");
              } catch {
                toast.error("Failed to generate plan");
              }
            }}
            className="btn-primary"
          >
            Generate Timeline
          </button>
          <p className="text-[12px] text-muted">
            We&apos;ll pull in your vendors and wedding party info automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1>Day-of Planner</h1>
        <PremiumButton onClick={exportPDF} className="btn-primary btn-sm">
          Export PDF
        </PremiumButton>
      </div>
      <p className="mt-1 text-[15px] text-muted">
        Your complete wedding day plan. Click any field to edit.
      </p>

      {/* Ceremony time */}
      <div className="mt-4 card p-4 flex flex-wrap items-center gap-3">
        <label className="text-[13px] font-semibold text-plum whitespace-nowrap">Ceremony time:</label>
        <input
          type="time"
          value={ceremonyTime}
          onChange={(e) => setCeremonyTime(e.target.value)}
          className="rounded-[10px] border-border px-3 py-1.5 text-[15px] w-36"
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
                : "border-transparent text-plum/60 hover:text-plum"
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
