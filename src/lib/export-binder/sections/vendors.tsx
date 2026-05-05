import React from "react";
import type { Styles } from "../styles";
import { rowStyle } from "../styles";
import type { Vendor } from "../types";
import { SectionHeader, Footer } from "./shared";

type VendorsProps = {
  vendorList: Vendor[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function VendorsPage({ vendorList, s, PdfPage, Text, View }: VendorsProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Vendor Contact Sheet" s={s} Text={Text} View={View} />
        {vendorList.length === 0 ? (
          <Text style={s.mutedText}>No vendors added yet.</Text>
        ) : (
          <View style={s.tableContainer}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { width: 80 }]}>Category</Text>
              <Text style={[s.tableHeaderCell, { width: 90 }]}>Vendor</Text>
              <Text style={[s.tableHeaderCell, { width: 80 }]}>Contact</Text>
              <Text style={[s.tableHeaderCell, { width: 85 }]}>Phone</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Email</Text>
            </View>
            {vendorList.map((v, i) => (
              <View key={i} style={rowStyle(s, i)} wrap={false}>
                <Text style={[s.tableCellMuted, { width: 80 }]}>{v.category}</Text>
                <Text style={[s.tableCellBold, { width: 90 }]}>{v.name}</Text>
                <Text style={[s.tableCell, { width: 80 }]}>{v.poc_name || "\u2014"}</Text>
                <Text style={[s.tableCell, { width: 85 }]}>{v.poc_phone || "\u2014"}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{v.poc_email || "\u2014"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Vendor arrival & meal info */}
        {vendorList.some((v) => v.arrival_time || v.meal_count > 0) && (
          <>
            <Text style={s.subheading}>Arrival Times & Meals</Text>
            <View style={s.tableContainer}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, { width: 120 }]}>Vendor</Text>
                <Text style={[s.tableHeaderCell, { width: 100 }]}>Arrival Time</Text>
                <Text style={[s.tableHeaderCell, { flex: 1 }]}>Meals Needed</Text>
              </View>
              {vendorList
                .filter((v) => v.arrival_time || v.meal_count > 0)
                .map((v, i) => (
                  <View key={i} style={rowStyle(s, i)} wrap={false}>
                    <Text style={[s.tableCellBold, { width: 120 }]}>{v.name}</Text>
                    <Text style={[s.tableCell, { width: 100 }]}>{v.arrival_time || "\u2014"}</Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>
                      {v.meal_count > 0 ? String(v.meal_count) : "\u2014"}
                    </Text>
                  </View>
                ))}
            </View>
          </>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
