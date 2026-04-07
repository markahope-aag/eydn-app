import React from "react";
import type { Styles } from "../styles";
import { SectionHeader, Footer } from "./shared";

type NotesProps = {
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function NotesPage({ s, PdfPage, Text, View }: NotesProps) {
  return (
    <PdfPage size="A4" style={s.page}>
      <View style={s.body}>
        <SectionHeader title="Notes" s={s} Text={Text} View={View} />
        <Text style={s.mutedText}>Use this page for handwritten notes on the day.</Text>
        {Array.from({ length: 22 }).map((_, i) => (
          <View key={i} style={s.noteLine} />
        ))}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
