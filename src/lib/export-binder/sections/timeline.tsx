import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { DayOfPlan, TimelineGroup } from "../types";
import { SectionHeader, Footer } from "./shared";

type TimelineProps = {
  dayOf: DayOfPlan;
  timelineByGroup: TimelineGroup[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function buildTimelineGroups(dayOf: DayOfPlan): TimelineGroup[] {
  const groupNames = ["Everyone", "Partner 1", "Partner 2", "Attendants", "Family", "Vendors"];
  const allTimeline = dayOf.timeline || [];
  const result: TimelineGroup[] = [];

  const everyoneItems = allTimeline.filter(
    (t) => !t.forGroup || t.forGroup === "Everyone"
  );
  if (everyoneItems.length > 0) {
    result.push({ label: "Everyone", items: everyoneItems });
  }
  for (const grp of groupNames.slice(1)) {
    const items = allTimeline.filter((t) => t.forGroup === grp);
    if (items.length > 0) {
      result.push({ label: `${grp}'s Schedule`, items });
    }
  }
  // If no group-specific items exist, just show all in one block
  if (result.length === 0 && allTimeline.length > 0) {
    result.push({ label: "Timeline", items: allTimeline });
  }
  return result;
}

export function TimelinePages({ dayOf, timelineByGroup, s, PdfPage, Text, View }: TimelineProps) {
  return (
    <>
      {timelineByGroup.map((group, gi) => (
        <PdfPage key={`tl-${gi}`} size="A4" style={s.page} wrap>
          <View style={s.body}>
            <SectionHeader title={gi === 0 ? "Timeline" : group.label} s={s} Text={Text} View={View} />
            {gi === 0 && dayOf.ceremonyTime && (
              <Text style={s.mutedText}>Ceremony at {dayOf.ceremonyTime}</Text>
            )}
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Time</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Event</Text>
                <Text style={[s.tableHeaderCell, { width: 150 }]}>Notes</Text>
              </View>
              {group.items.map((item, i) => (
                <View key={i} style={rowStyle(s, i)} wrap={false}>
                  <Text style={[s.tableCellBold, { width: 80 }]}>{item.time}</Text>
                  <Text style={[s.tableCell, { flex: 1 }]}>{item.event}</Text>
                  <Text style={[s.tableCellMuted, { width: 150 }]}>{item.notes || "\u2014"}</Text>
                </View>
              ))}
            </View>
          </View>
          <Footer s={s} Text={Text} View={View} />
        </PdfPage>
      ))}

      {/* If no timeline data at all, show placeholder page */}
      {timelineByGroup.length === 0 && (
        <PdfPage size="A4" style={s.page}>
          <View style={s.body}>
            <SectionHeader title="Timeline" s={s} Text={Text} View={View} />
            <Text style={s.mutedText}>No timeline items added yet. Set your ceremony time to auto-generate.</Text>
          </View>
          <Footer s={s} Text={Text} View={View} />
        </PdfPage>
      )}
    </>
  );
}
