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
import { PackingPage } from "./sections/packing";
import { NotesPage } from "./sections/notes";

export async function exportWeddingBinder(): Promise<void> {
  // 1. Fetch all data
  const data = await fetchBinderData();
  const { wedding, dayOf, vendorList, partyList, guestList, tableList, assignmentList, positionList, expenseList, rehearsal, insuranceCerts } = data;

  // 2. Dynamic import of @react-pdf/renderer
  const {
    pdf,
    Document,
    Page: PdfPage,
    Text,
    View,
    Image,
    StyleSheet,
  } = await import("@react-pdf/renderer");

  // 3. Create styles
  const s = createStyles(StyleSheet);

  // 4. Prepare derived data
  const timelineByGroup = buildTimelineGroups(dayOf);

  // 5. Build the PDF document
  const PdfDoc = (
    <Document>
      <CoverPage wedding={wedding} s={s} PdfPage={PdfPage} Text={Text} View={View} Image={Image} />
      <TocPage s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <VendorsPage vendorList={vendorList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <TimelinePages dayOf={dayOf} timelineByGroup={timelineByGroup} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <CeremonyPage dayOf={dayOf} positionList={positionList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <MusicPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <SpeechesPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <SetupTasksPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <WeddingPartyPage partyList={partyList} s={s} PdfPage={PdfPage} Text={Text} View={View} Image={Image} />
      <AttirePage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <SeatingPage tableList={tableList} assignmentList={assignmentList} guestList={guestList} positionList={positionList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <GuestsPage guestList={guestList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <BudgetPage wedding={wedding} expenseList={expenseList} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <RehearsalDinnerPage rehearsal={rehearsal} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <PackingPage dayOf={dayOf} s={s} PdfPage={PdfPage} Text={Text} View={View} />
      <NotesPage s={s} PdfPage={PdfPage} Text={Text} View={View} />
    </Document>
  );

  // 6. Generate the binder.
  const blob = await pdf(PdfDoc).toBlob();

  // 7. Append vendor insurance certificates (PDF merge) when present.
  //    Falls back to the binder alone if the merge fails — the export
  //    must never break over a certificate.
  let finalBlob: Blob = blob;
  if (insuranceCerts.length > 0) {
    try {
      const { appendCertificates } = await import("./append-certificates");
      const certs = insuranceCerts.map((c) => ({
        vendorName: vendorList.find((v) => v.id === c.vendorId)?.name || "Vendor",
        fileName: c.fileName,
        fileUrl: c.fileUrl,
        mimeType: c.mimeType,
      }));
      const mergedBytes = await appendCertificates(await blob.arrayBuffer(), certs);
      finalBlob = new Blob([mergedBytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    } catch {
      finalBlob = blob;
    }
  }

  // 8. Download
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${wedding.partner1_name}-${wedding.partner2_name}-wedding-binder.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
