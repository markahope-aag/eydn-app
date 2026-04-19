import { toast } from "sonner";
import type { Guest } from "./_types";
import { STATUS_LABELS, ROLE_LABELS } from "./_types";

export const EXPORT_HEADERS = [
  "Name",
  "Email",
  "RSVP Status",
  "Role",
  "Meal Preference",
  "Plus One Name",
  "Phone",
  "Group",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "ZIP",
];

export function getExportRows(guests: Guest[]): string[][] {
  return guests.map((g) => [
    g.name,
    g.email || "",
    STATUS_LABELS[g.rsvp_status] || g.rsvp_status,
    g.role ? ROLE_LABELS[g.role] || g.role : "",
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

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportGuestsCSV(guests: Guest[]): void {
  if (guests.length === 0) return;
  const csv = [EXPORT_HEADERS, ...getExportRows(guests)]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, "guest-list.csv");
  toast.success("Guest list exported as CSV");
}

export async function exportGuestsXLSX(guests: Guest[]): Promise<void> {
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
  const rows = getExportRows(guests);
  for (const row of rows) ws.addRow(row);

  // Auto-size columns
  ws.columns.forEach((col, i) => {
    const maxLen = Math.max(EXPORT_HEADERS[i].length, ...rows.map((r) => String(r[i]).length));
    col.width = maxLen + 3;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, "guest-list.xlsx");
  toast.success("Guest list exported as Excel");
}

export async function exportGuestsPDF(guests: Guest[]): Promise<void> {
  if (guests.length === 0) return;
  const { pdf, Document, Page: PdfPage, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const brand = {
    violet: "#2C3E2D",
    plum: "#1A1A2E",
    muted: "#6B6B6B",
    lavender: "#EDE7DF",
    border: "#E8D5B7",
    blush: "#D4A5A5",
  };

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
    headerCell: {
      fontSize: 7,
      fontFamily: "Helvetica-Bold",
      color: brand.muted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: brand.border,
    },
    rowAlt: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: brand.border,
      backgroundColor: "#FDFAFF",
    },
    cell: { fontSize: 8, color: brand.plum },
    cellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.plum },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 36,
      right: 36,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    footerText: { fontSize: 7, color: brand.muted },
    footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: brand.violet },
  });

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
          <Text style={s.stat}>
            Total: <Text style={s.statBold}>{guests.length}</Text>
          </Text>
          <Text style={s.stat}>
            Accepted: <Text style={s.statBold}>{guests.filter((g) => g.rsvp_status === "accepted").length}</Text>
          </Text>
          <Text style={s.stat}>
            Declined: <Text style={s.statBold}>{guests.filter((g) => g.rsvp_status === "declined").length}</Text>
          </Text>
        </View>
        <View style={s.table}>
          <View style={s.headerRow}>
            {cols.map((c) => (
              <Text key={c.label} style={[s.headerCell, { width: c.width }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {guests.map((g, i) => (
            <View key={g.id} style={i % 2 === 1 ? s.rowAlt : s.row}>
              <Text style={[s.cellBold, { width: cols[0].width }]}>{g.name}</Text>
              <Text style={[s.cell, { width: cols[1].width }]}>{g.email || "\u2014"}</Text>
              <Text style={[s.cell, { width: cols[2].width }]}>{STATUS_LABELS[g.rsvp_status]}</Text>
              <Text style={[s.cell, { width: cols[3].width }]}>
                {g.role ? ROLE_LABELS[g.role] || g.role : "\u2014"}
              </Text>
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
  triggerDownload(blob, "guest-list.pdf");
  toast.success("Guest list exported as PDF");
}
