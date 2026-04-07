import React from "react";
import type { Styles } from "../styles";
import type { DayOfPlan } from "../types";
import { SectionHeader, Footer } from "./shared";

type PackingProps = {
  dayOf: DayOfPlan;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function PackingPage({ dayOf, s, PdfPage, Text, View }: PackingProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Packing Checklist" s={s} Text={Text} View={View} />
        {dayOf.packingChecklist.length === 0 ? (
          <Text style={s.mutedText}>No packing items added yet.</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {dayOf.packingChecklist.map((p, i) => (
              <View key={i} style={[s.checkRow, { width: "50%" }]} wrap={false}>
                <View style={s.checkbox} />
                <View style={{ flex: 1 }}>
                  <Text style={s.checkLabel}>{p.item}</Text>
                  {p.notes ? <Text style={s.checkNotes}>{p.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
