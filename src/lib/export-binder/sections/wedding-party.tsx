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
  Image: React.ElementType;
};

export function WeddingPartyPage({ partyList, s, PdfPage, Text, View, Image }: WeddingPartyProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Wedding Party" s={s} Text={Text} View={View} />
        {partyList.length === 0 ? (
          <Text style={s.mutedText}>No wedding party members added yet.</Text>
        ) : (
          <View style={s.tableContainer}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { width: 34 }]}> </Text>
              <Text style={[s.tableHeaderCell, { width: 100 }]}>Name</Text>
              <Text style={[s.tableHeaderCell, { width: 90 }]}>Role</Text>
              <Text style={[s.tableHeaderCell, { width: 80 }]}>Phone</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Job Assignment</Text>
              <Text style={[s.tableHeaderCell, { width: 85 }]}>Attire</Text>
            </View>
            {partyList.map((p, i) => (
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <View style={{ width: 34, justifyContent: "center" }}>
                  {p.photo_url ? (
                    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img
                    <Image
                      src={p.photo_url}
                      style={{ width: 26, height: 26, borderRadius: 13, objectFit: "cover" }}
                    />
                  ) : null}
                </View>
                <Text style={[s.tableCellBold, { width: 100 }]}>{p.name}</Text>
                <Text style={[s.tableCellMuted, { width: 90 }]}>{p.role}</Text>
                <Text style={[s.tableCell, { width: 80 }]}>{p.phone || "—"}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{p.job_assignment || "—"}</Text>
                <Text style={[s.tableCellMuted, { width: 85 }]}>{p.attire || "—"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
