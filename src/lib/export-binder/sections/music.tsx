import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { DayOfPlan } from "../types";
import { SectionHeader, Footer } from "./shared";

type MusicProps = {
  dayOf: DayOfPlan;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function MusicPage({ dayOf, s, PdfPage, Text, View }: MusicProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Music" s={s} Text={Text} View={View} />
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
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <Text style={[s.tableCellBold, { width: 140 }]}>{m.moment}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{m.song || "\u2014"}</Text>
                <Text style={[s.tableCellMuted, { width: 140 }]}>{m.artist || "\u2014"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
