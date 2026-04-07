import React from "react";
import { createStyles } from "./styles";
import { fetchBinderData } from "./fetch-data";
import { CoverPage } from "./sections/cover";
import { TocPage } from "./sections/toc";
import { VendorsPage } from "./sections/vendors";
import { TimelinePages, buildTimelineGroups } from "./sections/timeline";
import { CeremonyPage } from "./sections/ceremony";
import { MusicPage } from "./sections/music";
import { SpeechesPage } from "./sections/speeches";
import { SetupTasksPage } from "./sections/setup-tasks";
import { WeddingPartyPage } from "./sections/wedding-party";
import { AttirePage } from "./sections/attire";
import { SeatingPage } from "./sections/seating";
import { GuestsPage } from "./sections/guests";
import { BudgetPage } from "./sections/budget";
import { RehearsalDinnerPage } from "./sections/rehearsal-dinner";
import { RegistryPage } from "./sections/registry";
import { PackingPage } from "./sections/packing";
import { NotesPage } from "./sections/notes";

export async function exportWeddingBinder(): Promise<void> {
  // 1. Fetch all data
  const data = await fetchBinderData();
  const { wedding, dayOf, vendorList, partyList, guestList, tableList, assignmentList, positionList, expenseList, rehearsal, registry } = data;

  // 2. Dynamic import of @react-pdf/renderer
  const {
    pdf,
    Document,
    Page: PdfPage,
    Text,
    View,
    StyleSheet,
  } = await import("@react-pdf/renderer");

  // 3. Create styles
  const s = createStyles(StyleSheet);

  // 4. Prepare derived data
  const timelineByGroup = buildTimelineGroups(dayOf);

  // 5. Build the PDF document
  const PdfDoc = (
    <Document>
      <CoverPage wedding={wedding} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <TocPage s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <VendorsPage vendorList={vendorList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <TimelinePages dayOf={dayOf} timelineByGroup={timelineByGroup} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <CeremonyPage dayOf={dayOf} positionList={positionList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <MusicPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <SpeechesPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <SetupTasksPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <WeddingPartyPage partyList={partyList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <AttirePage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <SeatingPage tableList={tableList} assignmentList={assignmentList} guestList={guestList} positionList={positionList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <GuestsPage guestList={guestList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <BudgetPage wedding={wedding} expenseList={expenseList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <RehearsalDinnerPage rehearsal={rehearsal} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <RegistryPage registry={registry} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <PackingPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <NotesPage s={s} PdfPage={PdfPage} Text={Text} View={View} />
    </Document>
  );

  // 6. Generate and download
  const blob = await pdf(PdfDoc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${wedding.partner1_name}-${wedding.partner2_name}-wedding-binder.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
