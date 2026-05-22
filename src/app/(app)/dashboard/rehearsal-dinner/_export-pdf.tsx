import { trackExport } from "@/lib/analytics";
import { toast } from "sonner";

type TimelineItem = { time: string; event: string };
type RehearsalGuest = { name: string; rsvp: string };

type RehearsalData = {
  venue: string | null;
  date: string | null;
  time: string | null;
  address: string | null;
  notes: string | null;
  hosted_by: string | null;
  dress_code: string | null;
  capacity: number | null;
  timeline: TimelineItem[];
  guest_list: RehearsalGuest[];
};

const RSVP_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

/** Download the rehearsal dinner plan as a branded one-page PDF —
 *  matches the day-of plan export. */
export async function exportRehearsalPDF(data: RehearsalData) {
  const { pdf, Document, Page: PdfPage, Text, View, Image, StyleSheet, Svg, Rect, Defs, LinearGradient, Stop, Circle } =
    await import("@react-pdf/renderer");

  const wedding = await fetch("/api/weddings")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const coupleName =
    wedding?.partner1_name && wedding?.partner2_name
      ? `${wedding.partner1_name} & ${wedding.partner2_name}`
      : wedding?.partner1_name || "Your Wedding";

  const brand = {
    violet: "#2C3E2D",
    blush: "#D4A5A5",
    softViolet: "#C9A84C",
    plum: "#1A1A2E",
    muted: "#6B6B6B",
    border: "#E8D5B7",
    white: "#FFFFFF",
  };

  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 10, color: brand.plum, backgroundColor: brand.white },
    headerBanner: { height: 100, position: "relative", overflow: "hidden" },
    headerContent: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 44, justifyContent: "center" },
    tagline: { fontSize: 9, color: brand.white, opacity: 0.85, marginTop: 2, letterSpacing: 0.5 },
    body: { paddingHorizontal: 44, paddingTop: 24, paddingBottom: 44 },
    pageTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: brand.plum },
    pageSubtitle: { fontSize: 10, color: brand.muted, marginBottom: 8 },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 8, gap: 8 },
    sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.violet },
    sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: brand.violet, textTransform: "uppercase" as const, letterSpacing: 1.5 },
    sectionDivider: { height: 1, backgroundColor: brand.border, marginBottom: 10 },
    detailGrid: { flexDirection: "row", flexWrap: "wrap" },
    detailItem: { width: "50%", marginBottom: 8 },
    detailLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.muted, textTransform: "uppercase" as const, letterSpacing: 0.8 },
    detailValue: { fontSize: 11, color: brand.plum, marginTop: 1 },
    notes: { fontSize: 10, color: brand.muted, lineHeight: 1.5, marginTop: 6 },
    timelineRow: { flexDirection: "row", alignItems: "flex-start" },
    timelineTime: { width: 90, fontSize: 10, fontFamily: "Helvetica-Bold", color: brand.violet, paddingVertical: 5 },
    timelineEvent: { flex: 1, fontSize: 10, color: brand.plum, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: brand.border },
    guestRow: { flexDirection: "row", justifyContent: "space-between", width: "50%", paddingVertical: 3, paddingRight: 14 },
    guestName: { fontSize: 10, color: brand.plum },
    guestRsvp: { fontSize: 8, color: brand.muted },
    footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 44, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: brand.border },
    footerText: { fontSize: 7, color: brand.muted },
    footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: brand.violet },
  });

  const PdfDoc = (
    <Document>
      <PdfPage size="A4" style={s.page}>
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
          </Svg>
          <View style={s.headerContent}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image src="/logo-white.png" style={{ width: 64, height: 20, objectFit: "contain", marginBottom: 6 }} />
            <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: brand.white, letterSpacing: 1 }}>
              {coupleName}
            </Text>
            <Text style={s.tagline}>Rehearsal Dinner</Text>
          </View>
        </View>
        <View style={s.body}>
          <Text style={s.pageTitle}>Rehearsal Dinner</Text>
          <Text style={s.pageSubtitle}>
            {data.hosted_by ? `Hosted by ${data.hosted_by}` : "The night before the big day"}
          </Text>

          <View style={s.sectionHeader}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitle}>Details</Text>
          </View>
          <View style={s.sectionDivider} />
          <View style={s.detailGrid}>
            {data.venue ? (
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Venue</Text>
                <Text style={s.detailValue}>{data.venue}</Text>
              </View>
            ) : null}
            {data.date ? (
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Date</Text>
                <Text style={s.detailValue}>{data.date}</Text>
              </View>
            ) : null}
            {data.time ? (
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Time</Text>
                <Text style={s.detailValue}>{data.time}</Text>
              </View>
            ) : null}
            {data.address ? (
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Address</Text>
                <Text style={s.detailValue}>{data.address}</Text>
              </View>
            ) : null}
            {data.dress_code ? (
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Dress Code</Text>
                <Text style={s.detailValue}>{data.dress_code}</Text>
              </View>
            ) : null}
            {data.capacity ? (
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Capacity</Text>
                <Text style={s.detailValue}>{String(data.capacity)}</Text>
              </View>
            ) : null}
          </View>
          {data.notes ? <Text style={s.notes}>{data.notes}</Text> : null}

          {data.timeline.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>Timeline</Text>
              </View>
              <View style={s.sectionDivider} />
              {data.timeline.map((t, i) => (
                <View key={i} style={s.timelineRow}>
                  <Text style={s.timelineTime}>{t.time}</Text>
                  <Text style={s.timelineEvent}>{t.event}</Text>
                </View>
              ))}
            </>
          )}

          {data.guest_list.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>
                  Guests ({data.guest_list.length}
                  {data.capacity ? ` / ${data.capacity}` : ""})
                </Text>
              </View>
              <View style={s.sectionDivider} />
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {data.guest_list.map((g, i) => (
                  <View key={i} style={s.guestRow}>
                    <Text style={s.guestName}>{g.name}</Text>
                    <Text style={s.guestRsvp}>{RSVP_LABELS[g.rsvp] || g.rsvp}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by Eydn</Text>
          <Text style={s.footerBrand}>eydn.app</Text>
        </View>
      </PdfPage>
    </Document>
  );

  const blob = await pdf(PdfDoc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rehearsal-dinner.pdf";
  a.click();
  URL.revokeObjectURL(url);
  trackExport("pdf");
  toast.success("PDF downloaded");
}
