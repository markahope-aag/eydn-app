import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { Guest } from "../types";
import { SectionHeader, Footer } from "./shared";

type GuestsProps = {
  guestList: Guest[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function GuestsPage({ guestList, s, PdfPage, Text, View }: GuestsProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Guest List" s={s} Text={Text} View={View} />
        {guestList.length === 0 ? (
          <Text style={s.mutedText}>No guests added yet.</Text>
        ) : (
          <>
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 30 }]}>#</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Name</Text>
                <Text style={[s.tableHeaderCell, { width: 70 }]}>RSVP</Text>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Meal</Text>
                <Text style={[s.tableHeaderCell, { width: 70 }]}>Role</Text>
                <Text style={[s.tableHeaderCell, { width: 80 }]}>Group</Text>
              </View>
              {guestList.map((g, i) => (
                <View key={i} style={rowStyle(s, i)} wrap={false}>
                  <Text style={[s.tableCell, { width: 30 }]}>{i + 1}</Text>
                  <Text style={[s.tableCellBold, { flex: 1 }]}>{g.name}</Text>
                  <Text style={[s.tableCellMuted, { width: 70 }]}>{g.rsvp_status || "\u2014"}</Text>
                  <Text style={[s.tableCell, { width: 80 }]}>{g.meal_preference || "\u2014"}</Text>
                  <Text style={[s.tableCellMuted, { width: 70 }]}>{g.role || "\u2014"}</Text>
                  <Text style={[s.tableCell, { width: 80 }]}>{g.group_name || "\u2014"}</Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={{ marginTop: 12 }}>
              <Text style={s.subheading}>RSVP Summary</Text>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Total Guests:</Text>
                <Text style={s.infoValue}>{guestList.length}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Accepted:</Text>
                <Text style={s.infoValue}>
                  {guestList.filter((g) => g.rsvp_status === "accepted").length}
                </Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Declined:</Text>
                <Text style={s.infoValue}>
                  {guestList.filter((g) => g.rsvp_status === "declined").length}
                </Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Pending:</Text>
                <Text style={s.infoValue}>
                  {guestList.filter((g) => g.rsvp_status === "pending" || g.rsvp_status === "invite_sent" || g.rsvp_status === "not_invited").length}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
