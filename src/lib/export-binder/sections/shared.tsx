import React from "react";
import type { Styles } from "../styles";
import { brand } from "../styles";

type SharedProps = {
  s: Styles;
  Text: React.ElementType;
  View: React.ElementType;
};

export function SectionHeader({ title, s, Text, View }: SharedProps & { title: string }) {
  return (
    <View>
      <Text style={s.sectionName}>{title}</Text>
      <View style={s.goldLine} />
    </View>
  );
}

export function Footer({ s, Text, View }: SharedProps) {
  return (
    <View style={s.footer} fixed>
      <Text style={{ fontSize: 8, color: brand.muted }}>Wedding Day Binder</Text>
      <Text
        style={s.footerPage}
        render={({ pageNumber }: { pageNumber: number }) => `${pageNumber}`}
      />
      <Text style={s.footerBrand}>Eydn</Text>
    </View>
  );
}
