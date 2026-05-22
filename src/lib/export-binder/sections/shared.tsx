import React from "react";
import type { Styles } from "../styles";
import { brand } from "../styles";

type SharedProps = {
  s: Styles;
  Text: React.ElementType;
  View: React.ElementType;
};

// ─── Table-of-contents page capture ──────────────────────────────────────────
// Section start pages are captured during a first render pass (via the
// render-prop callback below) so the table of contents can show real page
// numbers on the second pass. Module-level state is fine here — a binder
// export is a single sequential operation.

export type TocEntry = { title: string; page: number };

let tocEntries: TocEntry[] = [];

export function resetTocEntries() {
  tocEntries = [];
}

export function getTocEntries(): TocEntry[] {
  return tocEntries;
}

function recordTocEntry(title: string, page: number) {
  // First occurrence wins, so a section spanning multiple pages records
  // the page it started on.
  if (!tocEntries.some((e) => e.title === title)) {
    tocEntries.push({ title, page });
  }
}

export function SectionHeader({ title, s, Text, View }: SharedProps & { title: string }) {
  return (
    <View>
      {/* Invisible marker — records which page this section starts on. */}
      <Text
        style={{ position: "absolute", top: 0, left: 0, fontSize: 1, color: brand.white }}
        render={({ pageNumber }: { pageNumber: number }) => {
          recordTocEntry(title, pageNumber);
          return "";
        }}
      />
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
