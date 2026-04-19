import { trackExport } from "@/lib/analytics";
import { toast } from "sonner";
import { DayOfPlan } from "./types";

export async function exportDayOfPDF(plan: DayOfPlan) {
  const { pdf, Document, Page: PdfPage, Text, View, StyleSheet, Svg, Rect, Defs, LinearGradient, Stop, Circle } = await import("@react-pdf/renderer");

  // eydn brand colors
  const brand = {
    violet: "#2C3E2D",
    softViolet: "#C9A84C",
    blush: "#D4A5A5",
    petal: "#E8D5B7",
    lavender: "#EDE7DF",
    whisper: "#FAF6F1",
    plum: "#1A1A2E",
    muted: "#6B6B6B",
    border: "#E8D5B7",
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
        <Text style={s.logoText}>Eydn</Text>
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
          <Text style={s.footerText}>Generated by Eydn</Text>
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
  a.download = "day-of-plan.pdf";
  a.click();
  URL.revokeObjectURL(url);
  trackExport("pdf");
  toast.success("PDF downloaded");
}
