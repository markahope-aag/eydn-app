import React from "react";
import type { Styles } from "../styles";
import { rowStyle, formatDate } from "../styles";
import type { RehearsalDinner } from "../types";
import { SectionHeader, Footer } from "./shared";

type RehearsalDinnerProps = {
  rehearsal: RehearsalDinner | null;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function RehearsalDinnerPage({ rehearsal, s, PdfPage, Text, View }: RehearsalDinnerProps) {
  const isEmpty = !rehearsal || (!rehearsal.venue && !rehearsal.date && (!rehearsal.guest_list || rehearsal.guest_list.length === 0));

  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Rehearsal Dinner" s={s} Text={Text} View={View} />
        {isEmpty ? (
          <Text style={s.mutedText}>No rehearsal dinner details added yet.</Text>
        ) : (
          <>
            {rehearsal!.venue && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Venue:</Text>
                <Text style={s.infoValue}>{rehearsal!.venue}</Text>
              </View>
            )}
            {rehearsal!.date && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Date:</Text>
                <Text style={s.infoValue}>{formatDate(rehearsal!.date)}</Text>
              </View>
            )}
            {rehearsal!.time && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Time:</Text>
                <Text style={s.infoValue}>{rehearsal!.time}</Text>
              </View>
            )}
            {rehearsal!.address && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Address:</Text>
                <Text style={s.infoValue}>{rehearsal!.address}</Text>
              </View>
            )}
            {rehearsal!.notes && (
              <>
                <Text style={[s.subheading, { marginTop: 12 }]}>Notes</Text>
                <Text style={s.bodyText}>{rehearsal!.notes}</Text>
              </>
            )}

            {/* Rehearsal Timeline */}
            {rehearsal!.timeline && rehearsal!.timeline.length > 0 && (
              <>
                <Text style={s.subheading}>Timeline</Text>
                <View style={s.tableContainer}>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderCell, { width: 80 }]}>Time</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1 }]}>Event</Text>
                    <Text style={[s.tableHeaderCell, { width: 150 }]}>Notes</Text>
                  </View>
                  {rehearsal!.timeline.map((t: { time?: string; event?: string; notes?: string }, i: number) => (
                    <View key={i} style={rowStyle(s, i)} wrap={false}>
                      <Text style={[s.tableCellBold, { width: 80 }]}>{t.time || "\u2014"}</Text>
                      <Text style={[s.tableCell, { flex: 1 }]}>{t.event || "\u2014"}</Text>
                      <Text style={[s.tableCellMuted, { width: 150 }]}>{t.notes || "\u2014"}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Rehearsal Guest List */}
            {rehearsal!.guest_list && rehearsal!.guest_list.length > 0 && (
              <>
                <Text style={s.subheading}>Guest List</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {rehearsal!.guest_list.map((name: string, i: number) => (
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
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
