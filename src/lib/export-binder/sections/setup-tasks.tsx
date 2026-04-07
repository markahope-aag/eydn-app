import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { DayOfPlan } from "../types";
import { SectionHeader, Footer } from "./shared";

type SetupTasksProps = {
  dayOf: DayOfPlan;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function SetupTasksPage({ dayOf, s, PdfPage, Text, View }: SetupTasksProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Setup Tasks" s={s} Text={Text} View={View} />
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
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <Text style={[s.tableCellBold, { flex: 1 }]}>{t.task}</Text>
                <Text style={[s.tableCell, { width: 130 }]}>{t.assignedTo || "\u2014"}</Text>
                <Text style={[s.tableCellMuted, { width: 150 }]}>{t.notes || "\u2014"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
