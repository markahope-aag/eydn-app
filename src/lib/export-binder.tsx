/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Wedding = {
  partner1_name: string;
  partner2_name: string;
  date: string | null;
  venue: string | null;
  budget: number | null;
};

type DayOfPlan = {
  ceremonyTime: string;
  timeline: { time: string; event: string; notes: string; forGroup?: string }[];
  vendorContacts: { vendor: string; category: string; contact: string; phone: string }[];
  partyAssignments: { name: string; role: string; job: string; phone: string }[];
  packingChecklist: { item: string; notes: string }[];
  ceremonyScript: string;
  processionalOrder: string[];
  officiantNotes: string;
  music: { moment: string; song: string; artist: string }[];
  speeches: { speaker: string; role: string; topic: string }[];
  setupTasks: { task: string; assignedTo: string; notes: string }[];
  attire: { person: string; description: string; photoUrl: string | null }[];
};

type Vendor = {
  id: string;
  category: string;
  name: string;
  poc_name: string | null;
  poc_email: string | null;
  poc_phone: string | null;
  notes: string | null;
  amount: number | null;
  amount_paid: number | null;
  arrival_time: string | null;
  meal_needed: boolean;
};

type WeddingPartyMember = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  job_assignment: string | null;
  attire: string | null;
};

type Guest = {
  id: string;
  name: string;
  rsvp_status: string;
  meal_preference: string | null;
  role: string | null;
  group_name: string | null;
};

type SeatingTable = {
  id: string;
  table_number: number;
  name: string | null;
  shape: string;
  capacity: number;
};

type SeatAssignment = {
  id: string;
  seating_table_id: string;
  guest_id: string;
  seat_number: number | null;
};

type CeremonyPosition = {
  id: string;
  person_name: string;
  person_type: string;
  role: string | null;
  side: string | null;
  position_order: number;
};

type Expense = {
  id: string;
  description: string;
  estimated: number;
  amount_paid: number;
  final_cost: number | null;
  category: string;
  paid: boolean;
  vendor_name: string | null;
};

type RehearsalDinner = {
  venue: string | null;
  date: string | null;
  time: string | null;
  address: string | null;
  notes: string | null;
  timeline: { time?: string; event?: string; notes?: string }[];
  guest_list: string[];
};

// ─── Brand colors ────────────────────────────────────────────────────────────

const brand = {
  forest: "#2C3E2D",
  gold: "#C9A84C",
  cream: "#FAF6F1",
  charcoal: "#1A1A2E",
  rose: "#C08080",
  champagne: "#E8D5B7",
  white: "#FFFFFF",
  muted: "#6B6B6B",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function money(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Section names for TOC ───────────────────────────────────────────────────

const SECTIONS = [
  "Vendor Contact Sheet",
  "Timeline",
  "Ceremony",
  "Music",
  "Speeches",
  "Setup Tasks",
  "Wedding Party",
  "Attire",
  "Seating",
  "Guest List",
  "Budget Summary",
  "Rehearsal Dinner",
  "Packing Checklist",
  "Notes",
];

// ─── Main export ─────────────────────────────────────────────────────────────

export async function exportWeddingBinder(): Promise<void> {
  // 1. Fetch all data in parallel
  const [
    weddingData,
    dayOfRaw,
    vendors,
    weddingParty,
    guests,
    tables,
    assignments,
    ceremonyPositions,
    expenses,
    rehearsalDinner,
  ] = await Promise.all([
    fetchJSON<Wedding>("/api/weddings"),
    fetchJSON<{ content: DayOfPlan }>("/api/day-of"),
    fetchJSON<Vendor[]>("/api/vendors"),
    fetchJSON<WeddingPartyMember[]>("/api/wedding-party"),
    fetchJSON<Guest[]>("/api/guests"),
    fetchJSON<SeatingTable[]>("/api/seating/tables"),
    fetchJSON<SeatAssignment[]>("/api/seating/assignments"),
    fetchJSON<CeremonyPosition[]>("/api/ceremony"),
    fetchJSON<Expense[]>("/api/expenses"),
    fetchJSON<RehearsalDinner>("/api/rehearsal-dinner"),
  ]);

  const wedding = weddingData || { partner1_name: "Partner 1", partner2_name: "Partner 2", date: null, venue: null, budget: null };
  const rawDayOf = (dayOfRaw?.content as DayOfPlan) || {} as Partial<DayOfPlan>;

  // Migrate old string[] packing checklist to { item, notes }[]
  let packingChecklist = rawDayOf.packingChecklist || [];
  if (packingChecklist.length > 0 && typeof packingChecklist[0] === "string") {
    packingChecklist = (packingChecklist as unknown as string[]).map(
      (item) => ({ item, notes: "" })
    );
  }

  const dayOf: DayOfPlan = {
    ceremonyTime: rawDayOf.ceremonyTime || "",
    timeline: rawDayOf.timeline || [],
    vendorContacts: rawDayOf.vendorContacts || [],
    partyAssignments: rawDayOf.partyAssignments || [],
    packingChecklist,
    ceremonyScript: rawDayOf.ceremonyScript || "",
    processionalOrder: rawDayOf.processionalOrder || [],
    officiantNotes: rawDayOf.officiantNotes || "",
    music: rawDayOf.music || [],
    speeches: rawDayOf.speeches || [],
    setupTasks: rawDayOf.setupTasks || [],
    attire: rawDayOf.attire || [],
  };
  const vendorList = vendors || [];
  const partyList = weddingParty || [];
  const guestList = (guests || []).sort((a, b) => a.name.localeCompare(b.name));
  const tableList = tables || [];
  const assignmentList = assignments || [];
  const positionList = ceremonyPositions || [];
  const expenseList = expenses || [];
  const rehearsal = rehearsalDinner;

  // 2. Dynamic import of @react-pdf/renderer
  const {
    pdf,
    Document,
    Page: PdfPage,
    Text,
    View,
    StyleSheet,
  } = await import("@react-pdf/renderer");

  // 3. Styles
  const s = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: brand.charcoal,
      backgroundColor: brand.white,
      paddingBottom: 50,
    },
    body: {
      paddingHorizontal: 44,
      paddingTop: 28,
      paddingBottom: 20,
    },
    // Cover
    coverPage: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: brand.charcoal,
      backgroundColor: brand.cream,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 60,
    },
    coverNames: {
      fontSize: 28,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
      textAlign: "center",
      marginBottom: 8,
    },
    coverDate: {
      fontSize: 14,
      color: brand.charcoal,
      textAlign: "center",
      marginBottom: 6,
    },
    coverVenue: {
      fontSize: 12,
      color: brand.muted,
      textAlign: "center",
      marginBottom: 24,
    },
    coverGoldLine: {
      width: 120,
      height: 1,
      backgroundColor: brand.gold,
      marginBottom: 24,
    },
    coverSubtitle: {
      fontSize: 16,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
      textAlign: "center",
      marginBottom: 40,
    },
    coverPowered: {
      fontSize: 9,
      color: brand.muted,
      textAlign: "center",
      position: "absolute",
      bottom: 40,
    },
    // Section header
    sectionName: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
      marginBottom: 4,
    },
    goldLine: {
      height: 1,
      backgroundColor: brand.gold,
      marginBottom: 16,
    },
    // Table styles
    tableContainer: {
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: brand.champagne,
      overflow: "hidden",
      marginBottom: 12,
    },
    tableHeaderRow: {
      flexDirection: "row",
      backgroundColor: brand.champagne,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableHeaderCell: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: brand.champagne,
    },
    tableRowAlt: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: brand.champagne,
      backgroundColor: brand.cream,
    },
    tableCell: {
      fontSize: 10,
      color: brand.charcoal,
    },
    tableCellBold: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: brand.charcoal,
    },
    tableCellMuted: {
      fontSize: 10,
      color: brand.muted,
    },
    // Footer
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 44,
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 0.5,
      borderTopColor: brand.champagne,
    },
    footerPage: {
      fontSize: 8,
      color: brand.muted,
      textAlign: "center",
      flex: 1,
    },
    footerBrand: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
    },
    // Packing
    checkRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 3,
      gap: 8,
    },
    checkbox: {
      width: 11,
      height: 11,
      borderRadius: 2,
      borderWidth: 1.5,
      borderColor: brand.forest,
      marginTop: 1,
    },
    checkLabel: {
      fontSize: 10,
      color: brand.charcoal,
      flex: 1,
    },
    checkNotes: {
      fontSize: 8,
      color: brand.muted,
    },
    // TOC
    tocRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: brand.champagne,
    },
    tocText: {
      fontSize: 12,
      color: brand.charcoal,
    },
    tocNum: {
      fontSize: 12,
      color: brand.muted,
    },
    // Notes
    noteLine: {
      borderBottomWidth: 0.5,
      borderBottomColor: brand.champagne,
      height: 28,
    },
    // Misc
    subheading: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
      marginTop: 16,
      marginBottom: 6,
    },
    bodyText: {
      fontSize: 10,
      color: brand.charcoal,
      lineHeight: 1.6,
      marginBottom: 8,
    },
    mutedText: {
      fontSize: 9,
      color: brand.muted,
      marginBottom: 4,
    },
    roseDivider: {
      height: 2,
      backgroundColor: brand.rose,
      marginVertical: 16,
      borderRadius: 1,
    },
    infoRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    infoLabel: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
      width: 100,
    },
    infoValue: {
      fontSize: 10,
      color: brand.charcoal,
      flex: 1,
    },
    totalRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: brand.champagne,
    },
    totalCell: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: brand.forest,
    },
  });

  // ─── Reusable components ─────────────────────────────────────────────────

  const SectionHeader = ({ title }: { title: string }) => (
    <View>
      <Text style={s.sectionName}>{title}</Text>
      <View style={s.goldLine} />
    </View>
  );

  const Footer = () => (
    <View style={s.footer} fixed>
      <Text style={{ fontSize: 8, color: brand.muted }}>Wedding Day Binder</Text>
      <Text
        style={s.footerPage}
        render={({ pageNumber }: { pageNumber: number }) => `${pageNumber}`}
      />
      <Text style={s.footerBrand}>Eydn</Text>
    </View>
  );

  // Helper to pick alternating row style
  const rowStyle = (i: number) => (i % 2 === 1 ? s.tableRowAlt : s.tableRow);

  // ─── Timeline groups ─────────────────────────────────────────────────────

  const timelineGroups = ["Everyone", "Bride", "Groom", "Bridesmaids", "Groomsmen"];
  const allTimeline = dayOf.timeline || [];

  const timelineByGroup: { label: string; items: typeof allTimeline }[] = [];
  // "Everyone" = items with no forGroup or forGroup === "Everyone"
  const everyoneItems = allTimeline.filter(
    (t) => !t.forGroup || t.forGroup === "Everyone"
  );
  if (everyoneItems.length > 0) {
    timelineByGroup.push({ label: "Everyone", items: everyoneItems });
  }
  for (const grp of timelineGroups.slice(1)) {
    const items = allTimeline.filter((t) => t.forGroup === grp);
    if (items.length > 0) {
      timelineByGroup.push({ label: `${grp}'s Schedule`, items });
    }
  }
  // If no group-specific items exist, just show all in one block
  if (timelineByGroup.length === 0 && allTimeline.length > 0) {
    timelineByGroup.push({ label: "Timeline", items: allTimeline });
  }

  // ─── Guest map for seating ───────────────────────────────────────────────

  const guestMap = new Map<string, string>();
  for (const g of guestList) {
    guestMap.set(g.id, g.name);
  }

  // ─── Budget by category ──────────────────────────────────────────────────

  const budgetCategories = new Map<string, { estimated: number; paid: number }>();
  for (const e of expenseList) {
    const cat = e.category || "Uncategorized";
    const existing = budgetCategories.get(cat) || { estimated: 0, paid: 0 };
    existing.estimated += e.estimated || 0;
    existing.paid += e.amount_paid || 0;
    budgetCategories.set(cat, existing);
  }

  // ─── Compute TOC page estimates ──────────────────────────────────────────
  // We cannot know exact page numbers in @react-pdf before render, so we
  // provide section order numbers instead.

  // ─── Build the PDF document ──────────────────────────────────────────────

  const PdfDoc = (
    <Document>
      {/* ── PAGE 1: COVER ──────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.coverPage}>
        <Text style={s.coverNames}>
          {wedding.partner1_name} & {wedding.partner2_name}
        </Text>
        <Text style={s.coverDate}>{formatDate(wedding.date)}</Text>
        {wedding.venue && <Text style={s.coverVenue}>{wedding.venue}</Text>}
        <View style={s.coverGoldLine} />
        <Text style={s.coverSubtitle}>Day-of Wedding Binder</Text>
        <Text style={s.coverPowered}>Powered by Eydn</Text>
      </PdfPage>

      {/* ── PAGE 2: TABLE OF CONTENTS ──────────────────────────────────── */}
      <PdfPage size="A4" style={s.page}>
        <View style={s.body}>
          <SectionHeader title="Table of Contents" />
          {SECTIONS.map((name, i) => (
            <View key={i} style={s.tocRow}>
              <Text style={s.tocText}>
                {i + 1}. {name}
              </Text>
              <Text style={s.tocNum}>{"\u2022\u2022\u2022"}</Text>
            </View>
          ))}
        </View>
        <Footer />
      </PdfPage>

      {/* ── VENDOR CONTACT SHEET ───────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Vendor Contact Sheet" />
          {vendorList.length === 0 ? (
            <Text style={s.mutedText}>No vendors added yet.</Text>
          ) : (
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Category</Text>
                <Text style={[s.tableHeaderCell, { width: 90 }]}>Vendor</Text>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Contact</Text>
                <Text style={[s.tableHeaderCell, { width: 85 }]}>Phone</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Email</Text>
              </View>
              {vendorList.map((v, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCellMuted, { width: 80 }]}>{v.category}</Text>
                  <Text style={[s.tableCellBold, { width: 90 }]}>{v.name}</Text>
                  <Text style={[s.tableCell, { width: 80 }]}>{v.poc_name || "\u2014"}</Text>
                  <Text style={[s.tableCell, { width: 85 }]}>{v.poc_phone || "\u2014"}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{v.poc_email || "\u2014"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Vendor arrival & meal info */}
          {vendorList.some((v) => v.arrival_time || v.meal_needed) && (
            <>
              <Text style={s.subheading}>Arrival Times & Meals</Text>
              <View style={s.tableContainer}>
                <View style={s.tableHeaderRow}>
                  <Text style={[s.tableHeaderCell, { width: 120 }]}>Vendor</Text>
                  <Text style={[s.tableHeaderCell, { width: 100 }]}>Arrival Time</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1 }]}>Meal Needed</Text>
                </View>
                {vendorList
                  .filter((v) => v.arrival_time || v.meal_needed)
                  .map((v, i) => (
                    <View key={i} style={rowStyle(i)} wrap={false}>
                      <Text style={[s.tableCellBold, { width: 120 }]}>{v.name}</Text>
                      <Text style={[s.tableCell, { width: 100 }]}>{v.arrival_time || "\u2014"}</Text>
                      <Text style={[s.tableCell, { flex: 1 }]}>{v.meal_needed ? "Yes" : "No"}</Text>
                    </View>
                  ))}
              </View>
            </>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── TIMELINE (per-role pages) ──────────────────────────────────── */}
      {timelineByGroup.map((group, gi) => (
        <PdfPage key={`tl-${gi}`} size="A4" style={s.page} wrap>
          <View style={s.body}>
            <SectionHeader title={gi === 0 ? "Timeline" : group.label} />
            {gi === 0 && dayOf.ceremonyTime && (
              <Text style={s.mutedText}>Ceremony at {dayOf.ceremonyTime}</Text>
            )}
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Time</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Event</Text>
                <Text style={[s.tableHeaderCell, { width: 150 }]}>Notes</Text>
              </View>
              {group.items.map((item, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCellBold, { width: 80 }]}>{item.time}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{item.event}</Text>
                  <Text style={[s.tableCellMuted, { width: 150 }]}>{item.notes || "\u2014"}</Text>
                </View>
              ))}
            </View>
          </View>
          <Footer />
        </PdfPage>
      ))}

      {/* If no timeline data at all, show placeholder page */}
      {timelineByGroup.length === 0 && (
        <PdfPage size="A4" style={s.page}>
          <View style={s.body}>
            <SectionHeader title="Timeline" />
            <Text style={s.mutedText}>No timeline items added yet. Set your ceremony time to auto-generate.</Text>
          </View>
          <Footer />
        </PdfPage>
      )}

      {/* ── CEREMONY ───────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Ceremony" />

          {/* Processional Order */}
          {dayOf.processionalOrder.length > 0 && (
            <>
              <Text style={s.subheading}>Processional Order</Text>
              {dayOf.processionalOrder.map((person, i) => (
                <Text key={i} style={s.bodyText}>
                  {i + 1}. {person}
                </Text>
              ))}
            </>
          )}

          {/* Ceremony Positions */}
          {positionList.length > 0 && (
            <>
              <Text style={s.subheading}>Ceremony Positions</Text>
              <View style={s.tableContainer}>
                <View style={s.tableHeaderRow}>
                  <Text style={[s.tableHeaderCell, { width: 40 }]}>#</Text>
                  <Text style={[s.tableHeaderCell, { width: 130 }]}>Name</Text>
                  <Text style={[s.tableHeaderCell, { width: 100 }]}>Type</Text>
                  <Text style={[s.tableHeaderCell, { width: 80 }]}>Role</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1 }]}>Side</Text>
                </View>
                {positionList.map((p, i) => (
                  <View key={i} style={rowStyle(i)} wrap={false}>
                    <Text style={[s.tableCell, { width: 40 }]}>{p.position_order}</Text>
                    <Text style={[s.tableCellBold, { width: 130 }]}>{p.person_name}</Text>
                    <Text style={[s.tableCellMuted, { width: 100 }]}>{p.person_type}</Text>
                    <Text style={[s.tableCell, { width: 80 }]}>{p.role || "\u2014"}</Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>{p.side || "\u2014"}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Ceremony Script */}
          {dayOf.ceremonyScript && (
            <>
              <Text style={s.subheading}>Ceremony Script</Text>
              <Text style={s.bodyText}>{dayOf.ceremonyScript}</Text>
            </>
          )}

          {/* Officiant Notes */}
          {dayOf.officiantNotes && (
            <>
              <Text style={s.subheading}>Officiant Notes</Text>
              <Text style={s.bodyText}>{dayOf.officiantNotes}</Text>
            </>
          )}

          {!dayOf.processionalOrder.length && !positionList.length && !dayOf.ceremonyScript && !dayOf.officiantNotes && (
            <Text style={s.mutedText}>No ceremony details added yet.</Text>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── MUSIC ──────────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Music" />
          {dayOf.music.length === 0 ? (
            <Text style={s.mutedText}>No music selections added yet.</Text>
          ) : (
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 140 }]}>Moment</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Song</Text>
                <Text style={[s.tableHeaderCell, { width: 140 }]}>Artist</Text>
              </View>
              {dayOf.music.map((m, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCellBold, { width: 140 }]}>{m.moment}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{m.song || "\u2014"}</Text>
                  <Text style={[s.tableCellMuted, { width: 140 }]}>{m.artist || "\u2014"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── SPEECHES ───────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Speeches" />
          {dayOf.speeches.length === 0 ? (
            <Text style={s.mutedText}>No speeches scheduled yet.</Text>
          ) : (
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 50 }]}>Order</Text>
                <Text style={[s.tableHeaderCell, { width: 140 }]}>Speaker</Text>
                <Text style={[s.tableHeaderCell, { width: 120 }]}>Role</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Topic</Text>
              </View>
              {dayOf.speeches.map((sp, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCell, { width: 50 }]}>{i + 1}</Text>
                  <Text style={[s.tableCellBold, { width: 140 }]}>{sp.speaker}</Text>
                  <Text style={[s.tableCellMuted, { width: 120 }]}>{sp.role || "\u2014"}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{sp.topic || "\u2014"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── SETUP TASKS ────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Setup Tasks" />
          {dayOf.setupTasks.length === 0 ? (
            <Text style={s.mutedText}>No setup tasks added yet.</Text>
          ) : (
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Task</Text>
                <Text style={[s.tableHeaderCell, { width: 130 }]}>Assigned To</Text>
                <Text style={[s.tableHeaderCell, { width: 150 }]}>Notes</Text>
              </View>
              {dayOf.setupTasks.map((t, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCellBold, { flex: 1 }]}>{t.task}</Text>
                  <Text style={[s.tableCell, { width: 130 }]}>{t.assignedTo || "\u2014"}</Text>
                  <Text style={[s.tableCellMuted, { width: 150 }]}>{t.notes || "\u2014"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── WEDDING PARTY ──────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Wedding Party" />
          {partyList.length === 0 ? (
            <Text style={s.mutedText}>No wedding party members added yet.</Text>
          ) : (
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 110 }]}>Name</Text>
                <Text style={[s.tableHeaderCell, { width: 90 }]}>Role</Text>
                <Text style={[s.tableHeaderCell, { width: 85 }]}>Phone</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Job Assignment</Text>
                <Text style={[s.tableHeaderCell, { width: 90 }]}>Attire</Text>
              </View>
              {partyList.map((p, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCellBold, { width: 110 }]}>{p.name}</Text>
                  <Text style={[s.tableCellMuted, { width: 90 }]}>{p.role}</Text>
                  <Text style={[s.tableCell, { width: 85 }]}>{p.phone || "\u2014"}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{p.job_assignment || "\u2014"}</Text>
                  <Text style={[s.tableCellMuted, { width: 90 }]}>{p.attire || "\u2014"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── ATTIRE ─────────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Attire" />
          {dayOf.attire.length === 0 ? (
            <Text style={s.mutedText}>No attire details added yet.</Text>
          ) : (
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 160 }]}>Person</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Description</Text>
              </View>
              {dayOf.attire.map((a, i) => (
                <View key={i} style={rowStyle(i)} wrap={false}>
                  <Text style={[s.tableCellBold, { width: 160 }]}>{a.person}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{a.description || "\u2014"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── SEATING ────────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Seating" />

          {tableList.length === 0 ? (
            <Text style={s.mutedText}>No seating tables created yet.</Text>
          ) : (
            <>
              {tableList.map((table, ti) => {
                const tableAssignments = assignmentList.filter(
                  (a) => a.seating_table_id === table.id
                );
                const guestNames = tableAssignments
                  .map((a) => guestMap.get(a.guest_id) || "Unknown Guest")
                  .sort();
                const tableName = table.name || `Table ${table.table_number}`;
                return (
                  <View key={ti} style={{ marginBottom: 12 }} wrap={false}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 }}>
                      <Text style={s.subheading}>{tableName}</Text>
                      <Text style={s.mutedText}>
                        {table.shape} | Capacity: {table.capacity} | Seated: {guestNames.length}
                      </Text>
                    </View>
                    {guestNames.length === 0 ? (
                      <Text style={s.mutedText}>No guests assigned</Text>
                    ) : (
                      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {guestNames.map((name, gi) => (
                          <Text key={gi} style={[s.bodyText, { width: "50%" }]}>
                            {"\u2022"} {name}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* Ceremony positions reference */}
          {positionList.length > 0 && (
            <>
              <View style={s.roseDivider} />
              <Text style={s.subheading}>Ceremony Positions</Text>
              {positionList.map((p, i) => (
                <Text key={i} style={s.bodyText}>
                  {p.position_order}. {p.person_name} ({p.person_type}){p.side ? ` \u2014 ${p.side} side` : ""}
                </Text>
              ))}
            </>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── GUEST LIST ─────────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Guest List" />
          {guestList.length === 0 ? (
            <Text style={s.mutedText}>No guests added yet.</Text>
          ) : (
            <>
              <View style={s.tableContainer}>
                <View style={s.tableHeaderRow}>
                  <Text style={[s.tableHeaderCell, { width: 30 }]}>#</Text>
                  <Text style={[s.tableHeaderCell, { flex: 1 }]}>Name</Text>
                  <Text style={[s.tableHeaderCell, { width: 70 }]}>RSVP</Text>
                  <Text style={[s.tableHeaderCell, { width: 80 }]}>Meal</Text>
                  <Text style={[s.tableHeaderCell, { width: 70 }]}>Role</Text>
                  <Text style={[s.tableHeaderCell, { width: 80 }]}>Group</Text>
                </View>
                {guestList.map((g, i) => (
                  <View key={i} style={rowStyle(i)} wrap={false}>
                    <Text style={[s.tableCell, { width: 30 }]}>{i + 1}</Text>
                    <Text style={[s.tableCellBold, { flex: 1 }]}>{g.name}</Text>
                    <Text style={[s.tableCellMuted, { width: 70 }]}>{g.rsvp_status || "\u2014"}</Text>
                    <Text style={[s.tableCell, { width: 80 }]}>{g.meal_preference || "\u2014"}</Text>
                    <Text style={[s.tableCellMuted, { width: 70 }]}>{g.role || "\u2014"}</Text>
                    <Text style={[s.tableCell, { width: 80 }]}>{g.group_name || "\u2014"}</Text>
                  </View>
                ))}
              </View>

              {/* Totals */}
              <View style={{ marginTop: 12 }}>
                <Text style={s.subheading}>RSVP Summary</Text>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Total Guests:</Text>
                  <Text style={s.infoValue}>{guestList.length}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Accepted:</Text>
                  <Text style={s.infoValue}>
                    {guestList.filter((g) => g.rsvp_status === "accepted").length}
                  </Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Declined:</Text>
                  <Text style={s.infoValue}>
                    {guestList.filter((g) => g.rsvp_status === "declined").length}
                  </Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Pending:</Text>
                  <Text style={s.infoValue}>
                    {guestList.filter((g) => g.rsvp_status === "pending" || g.rsvp_status === "invite_sent" || g.rsvp_status === "not_invited").length}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── BUDGET SUMMARY ─────────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Budget Summary" />
          {expenseList.length === 0 ? (
            <Text style={s.mutedText}>No expenses tracked yet.</Text>
          ) : (
            <>
              <View style={s.tableContainer}>
                <View style={s.tableHeaderRow}>
                  <Text style={[s.tableHeaderCell, { flex: 1 }]}>Category</Text>
                  <Text style={[s.tableHeaderCell, { width: 100, textAlign: "right" as const }]}>Estimated</Text>
                  <Text style={[s.tableHeaderCell, { width: 100, textAlign: "right" as const }]}>Paid</Text>
                  <Text style={[s.tableHeaderCell, { width: 100, textAlign: "right" as const }]}>Remaining</Text>
                </View>
                {Array.from(budgetCategories.entries()).map(([cat, vals], i) => (
                  <View key={i} style={rowStyle(i)} wrap={false}>
                    <Text style={[s.tableCellBold, { flex: 1 }]}>{cat}</Text>
                    <Text style={[s.tableCell, { width: 100, textAlign: "right" as const }]}>
                      {money(vals.estimated)}
                    </Text>
                    <Text style={[s.tableCell, { width: 100, textAlign: "right" as const }]}>
                      {money(vals.paid)}
                    </Text>
                    <Text style={[s.tableCell, { width: 100, textAlign: "right" as const }]}>
                      {money(vals.estimated - vals.paid)}
                    </Text>
                  </View>
                ))}
                {/* Grand total row */}
                <View style={s.totalRow}>
                  <Text style={[s.totalCell, { flex: 1 }]}>TOTAL</Text>
                  <Text style={[s.totalCell, { width: 100, textAlign: "right" as const }]}>
                    {money(Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0))}
                  </Text>
                  <Text style={[s.totalCell, { width: 100, textAlign: "right" as const }]}>
                    {money(Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.paid, 0))}
                  </Text>
                  <Text style={[s.totalCell, { width: 100, textAlign: "right" as const }]}>
                    {money(
                      Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0) -
                      Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.paid, 0)
                    )}
                  </Text>
                </View>
              </View>

              {wedding.budget && (
                <View style={{ marginTop: 12 }}>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Total Budget:</Text>
                    <Text style={s.infoValue}>{money(wedding.budget)}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Total Estimated:</Text>
                    <Text style={s.infoValue}>
                      {money(Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0))}
                    </Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Budget Left:</Text>
                    <Text style={s.infoValue}>
                      {money(wedding.budget - Array.from(budgetCategories.values()).reduce((sum, v) => sum + v.estimated, 0))}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── REHEARSAL DINNER ───────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Rehearsal Dinner" />
          {!rehearsal || (!rehearsal.venue && !rehearsal.date && (!rehearsal.guest_list || rehearsal.guest_list.length === 0)) ? (
            <Text style={s.mutedText}>No rehearsal dinner details added yet.</Text>
          ) : (
            <>
              {rehearsal.venue && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Venue:</Text>
                  <Text style={s.infoValue}>{rehearsal.venue}</Text>
                </View>
              )}
              {rehearsal.date && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Date:</Text>
                  <Text style={s.infoValue}>{formatDate(rehearsal.date)}</Text>
                </View>
              )}
              {rehearsal.time && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Time:</Text>
                  <Text style={s.infoValue}>{rehearsal.time}</Text>
                </View>
              )}
              {rehearsal.address && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Address:</Text>
                  <Text style={s.infoValue}>{rehearsal.address}</Text>
                </View>
              )}
              {rehearsal.notes && (
                <>
                  <Text style={[s.subheading, { marginTop: 12 }]}>Notes</Text>
                  <Text style={s.bodyText}>{rehearsal.notes}</Text>
                </>
              )}

              {/* Rehearsal Timeline */}
              {rehearsal.timeline && rehearsal.timeline.length > 0 && (
                <>
                  <Text style={s.subheading}>Timeline</Text>
                  <View style={s.tableContainer}>
                    <View style={s.tableHeaderRow}>
                      <Text style={[s.tableHeaderCell, { width: 80 }]}>Time</Text>
                      <Text style={[s.tableHeaderCell, { flex: 1 }]}>Event</Text>
                      <Text style={[s.tableHeaderCell, { width: 150 }]}>Notes</Text>
                    </View>
                    {rehearsal.timeline.map((t: any, i: number) => (
                      <View key={i} style={rowStyle(i)} wrap={false}>
                        <Text style={[s.tableCellBold, { width: 80 }]}>{t.time || "\u2014"}</Text>
                        <Text style={[s.tableCell, { flex: 1 }]}>{t.event || "\u2014"}</Text>
                        <Text style={[s.tableCellMuted, { width: 150 }]}>{t.notes || "\u2014"}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Rehearsal Guest List */}
              {rehearsal.guest_list && rehearsal.guest_list.length > 0 && (
                <>
                  <Text style={s.subheading}>Guest List</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {rehearsal.guest_list.map((name: string, i: number) => (
                      <Text key={i} style={[s.bodyText, { width: "50%" }]}>
                        {i + 1}. {name}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── PACKING CHECKLIST ──────────────────────────────────────────── */}
      <PdfPage size="A4" style={s.page} wrap>
        <View style={s.body}>
          <SectionHeader title="Packing Checklist" />
          {dayOf.packingChecklist.length === 0 ? (
            <Text style={s.mutedText}>No packing items added yet.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {dayOf.packingChecklist.map((p, i) => (
                <View key={i} style={[s.checkRow, { width: "50%" }]} wrap={false}>
                  <View style={s.checkbox} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.checkLabel}>{p.item}</Text>
                    {p.notes ? <Text style={s.checkNotes}>{p.notes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        <Footer />
      </PdfPage>

      {/* ── NOTES (blank lined page) ───────────────────────────────────── */}
      <PdfPage size="A4" style={s.page}>
        <View style={s.body}>
          <SectionHeader title="Notes" />
          <Text style={s.mutedText}>Use this page for handwritten notes on the day.</Text>
          {Array.from({ length: 22 }).map((_, i) => (
            <View key={i} style={s.noteLine} />
          ))}
        </View>
        <Footer />
      </PdfPage>
    </Document>
  );

  // 4. Generate and download
  const blob = await pdf(PdfDoc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${wedding.partner1_name}-${wedding.partner2_name}-wedding-binder.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
