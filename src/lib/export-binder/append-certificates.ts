import type { PDFImage } from "pdf-lib";

export type CertFile = {
  vendorName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
};

// US Letter, in points.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;

/**
 * Append vendor insurance certificates to the generated day-of binder.
 * PDF certificates are merged page-for-page; JPG/PNG certificates each
 * get their own page. Anything that can't be read is skipped so a single
 * bad file never breaks the binder export.
 */
export async function appendCertificates(
  binderBytes: ArrayBuffer,
  certs: CertFile[]
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

  // Section divider page listing the certificates that follow.
  const divider = merged.addPage([PAGE_W, PAGE_H]);
  divider.drawText("Vendor Insurance Certificates", {
    x: MARGIN,
    y: PAGE_H - 110,
    size: 22,
    font: boldFont,
    color: rgb(0.17, 0.24, 0.18),
  });
  divider.drawText("Many venues require proof of vendor liability insurance.", {
    x: MARGIN,
    y: PAGE_H - 140,
    size: 11,
    font,
    color: rgb(0.42, 0.42, 0.42),
  });
  divider.drawText("The certificates on the following pages are ready for your venue.", {
    x: MARGIN,
    y: PAGE_H - 156,
    size: 11,
    font,
    color: rgb(0.42, 0.42, 0.42),
  });
  let listY = PAGE_H - 200;
  for (const c of certs) {
    if (listY < MARGIN) break;
    divider.drawText(`-  ${c.vendorName}: ${c.fileName}`, {
      x: MARGIN,
      y: listY,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    listY -= 18;
  }

  for (const cert of certs) {
    try {
      const res = await fetch(cert.fileUrl);
      if (!res.ok) continue;
      const bytes = await res.arrayBuffer();
      const mime = (cert.mimeType || "").toLowerCase();
      const name = cert.fileName.toLowerCase();

      if (mime.includes("pdf") || name.endsWith(".pdf")) {
        const certDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(certDoc, certDoc.getPageIndices());
        for (const p of pages) merged.addPage(p);
      } else if (mime.includes("png") || name.endsWith(".png")) {
        addImagePage(await merged.embedPng(bytes), `${cert.vendorName} - insurance certificate`);
      } else if (
        mime.includes("jpeg") ||
        mime.includes("jpg") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg")
      ) {
        addImagePage(await merged.embedJpg(bytes), `${cert.vendorName} - insurance certificate`);
      }
      // Other formats (webp, heic, …) can't be embedded — skipped.
    } catch {
      // Skip a certificate that fails to download or parse.
    }
  }

  return merged.save();
}
