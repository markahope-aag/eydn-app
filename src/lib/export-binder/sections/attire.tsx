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

// Order attire groups consistently in the binder; unassigned entries last.
const GROUP_ORDER = [
  "Partner 1",
  "Partner 2",
  "Partner 1's Party",
  "Partner 2's Party",
  "Family",
  "Other",
];

type AttireItem = DayOfPlan["attire"][number];

export function AttirePage({ dayOf, s, PdfPage, Text, View, Image }: AttireProps) {
  // Bucket entries by group so the binder mirrors the planner's grouping.
  const byGroup = new Map<string, AttireItem[]>();
  for (const a of dayOf.attire) {
    const key = a.group || "Unassigned";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(a);
  }
  const orderedKeys = [
    ...GROUP_ORDER.filter((g) => byGroup.has(g)),
    ...(byGroup.has("Unassigned") ? ["Unassigned"] : []),
  ];
  const showGroups = orderedKeys.length > 1;

  // Running index keeps row striping consistent across group sections.
  let rowIndex = 0;

  const renderRow = (a: AttireItem, key: string) => (
    <View key={key} style={rowStyle(s, rowIndex++)} wrap={false}>
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
  );

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
            {showGroups
              ? orderedKeys.map((groupKey) => (
                  <View key={groupKey}>
                    <View style={{ backgroundColor: "#EDE7DF", paddingVertical: 3, paddingHorizontal: 6 }} wrap={false}>
                      <Text style={[s.tableCellBold, { width: "100%" }]}>{groupKey}</Text>
                    </View>
                    {byGroup.get(groupKey)!.map((a, j) => renderRow(a, `${groupKey}-${j}`))}
                  </View>
                ))
              : dayOf.attire.map((a, i) => renderRow(a, String(i)))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
