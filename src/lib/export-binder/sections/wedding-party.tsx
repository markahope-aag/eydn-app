import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { WeddingPartyMember } from "../types";
import { SectionHeader, Footer } from "./shared";

type WeddingPartyProps = {
  partyList: WeddingPartyMember[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function WeddingPartyPage({ partyList, s, PdfPage, Text, View }: WeddingPartyProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Wedding Party" s={s} Text={Text} View={View} />
        {partyList.length === 0 ? (
          <Text style={s.mutedText}>No wedding party members added yet.</Text>
        ) : (
          <View style={s.tableContainer}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { width: 110 }]}>Name</Text>
              <Text style={[s.tableHeaderCell, { width: 90 }]}>Role</Text>
              <Text style={[s.tableHeaderCell, { width: 85 }]}>Phone</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Job Assignment</Text>
              <Text style={[s.tableHeaderCell, { width: 90 }]}>Attire</Text>
            </View>
            {partyList.map((p, i) => (
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <Text style={[s.tableCellBold, { width: 110 }]}>{p.name}</Text>
                <Text style={[s.tableCellMuted, { width: 90 }]}>{p.role}</Text>
                <Text style={[s.tableCell, { width: 85 }]}>{p.phone || "\u2014"}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{p.job_assignment || "\u2014"}</Text>
                <Text style={[s.tableCellMuted, { width: 90 }]}>{p.attire || "\u2014"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
