import React from "react";
import type { Styles } from "../styles";
import { brand } from "../styles";
import type { SeatingTable, FloorObject, SeatAssignment, Guest, CeremonyPosition } from "../types";
import { SectionHeader, Footer } from "./shared";

type SeatingProps = {
  tableList: SeatingTable[];
  floorObjects: FloorObject[];
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
  floorObjects,
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

  // Floor-plan diagram geometry — scale the on-screen canvas down to fit
  // the page, preserving each table's and area's relative position.
  const tableW = (t: SeatingTable) => (t.shape === "round" ? 140 : 200);
  const tableH = (t: SeatingTable) => (t.shape === "round" ? 140 : 90);
  let contentW = 0;
  let contentH = 0;
  for (const t of tableList) {
    contentW = Math.max(contentW, t.x + tableW(t));
    contentH = Math.max(contentH, t.y + tableH(t));
  }
  for (const o of floorObjects) {
    contentW = Math.max(contentW, o.x + o.width);
    contentH = Math.max(contentH, o.y + o.height);
  }
  contentW += 20;
  contentH += 20;
  const MAX_W = 507;
  const MAX_H = 360;
  const scale =
    contentW > 0 && contentH > 0
      ? Math.min(MAX_W / contentW, MAX_H / contentH, 1)
      : 1;
  const hasLayout = tableList.length > 0 || floorObjects.length > 0;

  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Seating" s={s} Text={Text} View={View} />

        {/* Visual floor plan — tables and areas in position */}
        {hasLayout && (
          <View
            wrap={false}
            style={{
              width: contentW * scale,
              height: contentH * scale,
              position: "relative",
              alignSelf: "center",
              marginBottom: 18,
            }}
          >
            {floorObjects.map((o) => (
              <View
                key={o.id}
                style={{
                  position: "absolute",
                  left: o.x * scale,
                  top: o.y * scale,
                  width: o.width * scale,
                  height: o.height * scale,
                  borderWidth: 1,
                  borderColor: brand.rose,
                  borderStyle: "dashed",
                  borderRadius: 4,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: Math.max(6, 9 * scale), color: brand.muted, textAlign: "center" }}>
                  {o.label}
                </Text>
              </View>
            ))}
            {tableList.map((t) => {
              const w = tableW(t) * scale;
              const h = tableH(t) * scale;
              const seated = assignmentList.filter((a) => a.seating_table_id === t.id).length;
              return (
                <View
                  key={t.id}
                  style={{
                    position: "absolute",
                    left: t.x * scale,
                    top: t.y * scale,
                    width: w,
                    height: h,
                    borderWidth: 1,
                    borderColor: brand.forest,
                    borderRadius: t.shape === "round" ? w / 2 : 8,
                    backgroundColor: brand.cream,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: Math.max(6, 8 * scale),
                      fontFamily: "Helvetica-Bold",
                      color: brand.forest,
                      textAlign: "center",
                    }}
                  >
                    {t.name || `Table ${t.table_number}`}
                  </Text>
                  <Text style={{ fontSize: Math.max(5, 7 * scale), color: brand.muted }}>
                    {seated}/{t.capacity}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Table assignments */}
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
                          {"•"} {name}
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
                {p.position_order}. {p.person_name} ({p.person_type}){p.side ? ` — ${p.side} side` : ""}
              </Text>
            ))}
          </>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
