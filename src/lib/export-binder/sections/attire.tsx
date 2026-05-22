import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { DayOfPlan } from "../types";
import { SectionHeader, Footer } from "./shared";

type AttireProps = {
  dayOf: DayOfPlan;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
  Image: React.ElementType;
};

export function AttirePage({ dayOf, s, PdfPage, Text, View, Image }: AttireProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Attire" s={s} Text={Text} View={View} />
        {dayOf.attire.length === 0 ? (
          <Text style={s.mutedText}>No attire details added yet.</Text>
        ) : (
          <View style={s.tableContainer}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { width: 50 }]}> </Text>
              <Text style={[s.tableHeaderCell, { width: 140 }]}>Person</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Description</Text>
            </View>
            {dayOf.attire.map((a, i) => (
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <View style={{ width: 50, justifyContent: "center" }}>
                  {a.photoUrl ? (
                    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                    <Image
                      src={a.photoUrl}
                      style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }}
                    />
                  ) : null}
                </View>
                <Text style={[s.tableCellBold, { width: 140 }]}>{a.person}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{a.description || "—"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
