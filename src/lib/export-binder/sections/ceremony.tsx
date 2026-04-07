import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { DayOfPlan, CeremonyPosition } from "../types";
import { SectionHeader, Footer } from "./shared";

type CeremonyProps = {
  dayOf: DayOfPlan;
  positionList: CeremonyPosition[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function CeremonyPage({ dayOf, positionList, s, PdfPage, Text, View }: CeremonyProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Ceremony" s={s} Text={Text} View={View} />

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
                <View key={i} style={rowStyle(s, i)} wrap={false}>
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
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
