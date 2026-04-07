import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { DayOfPlan } from "../types";
import { SectionHeader, Footer } from "./shared";

type SpeechesProps = {
  dayOf: DayOfPlan;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function SpeechesPage({ dayOf, s, PdfPage, Text, View }: SpeechesProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Speeches" s={s} Text={Text} View={View} />
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
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <Text style={[s.tableCell, { width: 50 }]}>{i + 1}</Text>
                <Text style={[s.tableCellBold, { width: 140 }]}>{sp.speaker}</Text>
                <Text style={[s.tableCellMuted, { width: 120 }]}>{sp.role || "\u2014"}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{sp.topic || "\u2014"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
