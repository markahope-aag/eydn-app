import React from "react";
import type { Styles } from "../styles";
import { formatDate } from "../styles";
import type { Wedding } from "../types";

type CoverProps = {
  wedding: Wedding;
  s: Styles;
  PdfPage: React.ElementType;
  Text: React.ElementType;
  View: React.ElementType;
  Image: React.ElementType;
};

export function CoverPage({ wedding, s, PdfPage, Text, View, Image }: CoverProps) {
  return (
    <PdfPage size="A4" style={s.coverPage}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
      <Image src="/logo.png" style={{ width: 120, height: 38, objectFit: "contain", marginBottom: 28 }} />
      <Text style={s.coverNames}>
        {wedding.partner1_name} & {wedding.partner2_name}
      </Text>
      <Text style={s.coverDate}>{formatDate(wedding.date)}</Text>
      {wedding.venue && <Text style={s.coverVenue}>{wedding.venue}</Text>}
      <View style={s.coverGoldLine} />
      <Text style={s.coverSubtitle}>Day-of Wedding Binder</Text>
      <Text style={s.coverPowered}>Powered by Eydn</Text>
    </PdfPage>
  );
}
