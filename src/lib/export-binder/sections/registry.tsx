import React from "react";
import type { Styles } from "../styles";
import { brand } from "../styles";
import type { RegistryLink } from "../types";
import { SectionHeader, Footer } from "./shared";

type RegistryProps = {
  registry: RegistryLink[];
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
};

export function RegistryPage({ registry, s, PdfPage, Text, View }: RegistryProps) {
  return (
    <PdfPage size="A4" style={s.page} wrap>
      <View style={s.body}>
        <SectionHeader title="Gift Registry" s={s} Text={Text} View={View} />
        {registry.length === 0 ? (
          <Text style={s.mutedText}>No registry links added yet.</Text>
        ) : (
          <View>
            <Text style={{ fontSize: 10, color: brand.muted, marginBottom: 12 }}>
              Share these links with guests who ask where you&apos;re registered.
            </Text>
            {registry.map((link, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 8, paddingBottom: 8, borderBottomWidth: i < registry.length - 1 ? 0.5 : 0, borderBottomColor: brand.champagne }} wrap={false}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: brand.forest, marginBottom: 2 }}>{link.name}</Text>
                  <Text style={{ fontSize: 9, color: brand.muted }}>{link.url}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      <Footer s={s} Text={Text} View={View} />
    </PdfPage>
  );
}
