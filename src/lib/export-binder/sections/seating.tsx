import React from "react";
import type { Styles } from "../styles";
import type { SeatingTable, SeatAssignment, Guest, CeremonyPosition } from "../types";
import { SectionHeader, Footer } from "./shared";

type SeatingProps = {
  tableList: SeatingTable[];
  assignmentList: SeatAssignment[];
  guestList: Guest[];
  positionList: CeremonyPosition[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function SeatingPage({
  tableList,
  assignmentList,
  guestList,
  positionList,
  s,
  PdfPage,
  Text,
  View,
}: SeatingProps) {
  const guestMap = new Map<string, string>();
  for (const g of guestList) {
    guestMap.set(g.id, g.name);
  }

  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Seating" s={s} Text={Text} View={View} />

        {tableList.length === 0 ? (
          <Text style={s.mutedText}>No seating tables created yet.</Text>
        ) : (
          <>
            {tableList.map((table, ti) => {
              const tableAssignments = assignmentList.filter(
                (a) => a.seating_table_id === table.id
              );
              const guestNames = tableAssignments
                .map((a) => guestMap.get(a.guest_id) || "Unknown Guest")
                .sort();
              const tableName = table.name || `Table ${table.table_number}`;
              return (
                <View key={ti} style={{ marginBottom: 12 }} wrap={false}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 8 }}>
                    <Text style={s.subheading}>{tableName}</Text>
                    <Text style={s.mutedText}>
                      {table.shape} | Capacity: {table.capacity} | Seated: {guestNames.length}
                    </Text>
                  </View>
                  {guestNames.length === 0 ? (
                    <Text style={s.mutedText}>No guests assigned</Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {guestNames.map((name, gi) => (
                        <Text key={gi} style={[s.bodyText, { width: "50%" }]}>
                          {"\u2022"} {name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Ceremony positions reference */}
        {positionList.length > 0 && (
          <>
            <View style={s.roseDivider} />
            <Text style={s.subheading}>Ceremony Positions</Text>
            {positionList.map((p, i) => (
              <Text key={i} style={s.bodyText}>
                {p.position_order}. {p.person_name} ({p.person_type}){p.side ? ` \u2014 ${p.side} side` : ""}
              </Text>
            ))}
          </>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
