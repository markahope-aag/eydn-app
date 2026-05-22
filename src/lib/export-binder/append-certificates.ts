import type { PDFImage } from "pdf-lib";

export type VendorDocFile = {
  vendorName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
};

export type DocSection = {
  title: string;
  description: string;
  docs: VendorDocFile[];
};

// US Letter, in points.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;

/**
 * Append vendor documents (contracts, insurance certificates) to the
 * generated day-of binder. Each section gets a divider page listing its
 * documents, then the documents themselves: PDFs merged page-for-page,
 * JPG/PNG files one per page. Anything that can't be read is skipped so a
 * single bad file never breaks the binder export.
 */
export async function appendVendorDocuments(
  binderBytes: ArrayBuffer,
  sections: DocSection[]
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const merged = await PDFDocument.load(binderBytes);
  const font = await merged.embedFont(StandardFonts.Helvetica);
  const boldFont = await merged.embedFont(StandardFonts.HelveticaBold);

  function addImagePage(img: PDFImage, caption: string) {
    const page = merged.addPage([PAGE_W, PAGE_H]);
    const maxW = PAGE_W - MARGIN * 2;
    const maxH = PAGE_H - MARGIN * 2 - 20;
    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * ratio;
    const h = img.height * ratio;
    page.drawImage(img, {
      x: (PAGE_W - w) / 2,
      y: (PAGE_H - h) / 2 + 10,
      width: w,
      height: h,
    });
    page.drawText(caption, {
      x: MARGIN,
      y: MARGIN - 8,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  for (const section of sections) {
    if (section.docs.length === 0) continue;

    // Divider page listing the documents that follow.
    const divider = merged.addPage([PAGE_W, PAGE_H]);
    divider.drawText(section.title, {
      x: MARGIN,
      y: PAGE_H - 110,
      size: 22,
      font: boldFont,
      color: rgb(0.17, 0.24, 0.18),
    });
    divider.drawText(section.description, {
      x: MARGIN,
      y: PAGE_H - 140,
      size: 11,
      font,
      color: rgb(0.42, 0.42, 0.42),
    });
    let listY = PAGE_H - 180;
    for (const d of section.docs) {
      if (listY < MARGIN) break;
      divider.drawText(`-  ${d.vendorName}: ${d.fileName}`, {
        x: MARGIN,
        y: listY,
        size: 10,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });
      listY -= 18;
    }

    for (const doc of section.docs) {
      try {
        const res = await fetch(doc.fileUrl);
        if (!res.ok) continue;
        const bytes = await res.arrayBuffer();
        const mime = (doc.mimeType || "").toLowerCase();
        const name = doc.fileName.toLowerCase();

        if (mime.includes("pdf") || name.endsWith(".pdf")) {
          const docPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await merged.copyPages(docPdf, docPdf.getPageIndices());
          for (const p of pages) merged.addPage(p);
        } else if (mime.includes("png") || name.endsWith(".png")) {
          addImagePage(await merged.embedPng(bytes), `${doc.vendorName} - ${doc.fileName}`);
        } else if (
          mime.includes("jpeg") ||
          mime.includes("jpg") ||
          name.endsWith(".jpg") ||
          name.endsWith(".jpeg")
        ) {
          addImagePage(await merged.embedJpg(bytes), `${doc.vendorName} - ${doc.fileName}`);
        }
        // Other formats (webp, heic, …) can't be embedded — skipped.
      } catch {
        // Skip a document that fails to download or parse.
      }
    }
  }

  return merged.save();
}
