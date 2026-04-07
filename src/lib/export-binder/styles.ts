export const brand = {
  forest: "#2C3E2D",
  gold: "#C9A84C",
  cream: "#FAF6F1",
  charcoal: "#1A1A2E",
  rose: "#C08080",
  champagne: "#E8D5B7",
  white: "#FFFFFF",
  muted: "#6B6B6B",
};

export const SECTIONS = [
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
  "Gift Registry",
  "Packing Checklist",
  "Notes",
];

export function formatDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export function money(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// React-PDF StyleSheet.create uses complex generics incompatible with simple typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStyles(StyleSheet: { create: (styles: any) => any }) {
  return StyleSheet.create({
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
}

export type Styles = ReturnType<typeof createStyles>;

export function rowStyle(s: Styles, i: number) {
  return i % 2 === 1 ? s.tableRowAlt : s.tableRow;
}
