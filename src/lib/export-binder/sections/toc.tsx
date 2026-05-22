import React from "react";
import type { Styles } from "../styles";
import type { TocEntry } from "./shared";
import { Footer } from "./shared";

type TocProps = {
  entries: TocEntry[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function TocPage({ entries, s, PdfPage, Text, View }: TocProps) {
  return (
    <PdfPage size="A4" style={s.page}>
      <View style={s.body}>
        {/* Rendered directly (not via SectionHeader) so the contents page
            doesn't list itself. */}
        <View>
          <Text style={s.sectionName}>Table of Contents</Text>
          <View style={s.goldLine} />
        </View>
        {entries.map((entry, i) => (
          <View key={i} style={s.tocRow}>
            <Text style={s.tocText}>
              {i + 1}. {entry.title}
            </Text>
            <Text style={s.tocNum}>{entry.page > 0 ? String(entry.page) : ""}</Text>
          </View>
        ))}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
