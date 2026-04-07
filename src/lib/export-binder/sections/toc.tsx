import React from "react";
import type { Styles } from "../styles";
import { SECTIONS } from "../styles";
import { SectionHeader, Footer } from "./shared";

type TocProps = {
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function TocPage({ s, PdfPage, Text, View }: TocProps) {
  return (
    <PdfPage size="A4" style={s.page}>
      <View style={s.body}>
        <SectionHeader title="Table of Contents" s={s} Text={Text} View={View} />
        {SECTIONS.map((name, i) => (
          <View key={i} style={s.tocRow}>
            <Text style={s.tocText}>
              {i + 1}. {name}
            </Text>
            <Text style={s.tocNum}>{"\u2022\u2022\u2022"}</Text>
          </View>
        ))}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
