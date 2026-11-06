export type DlpReceiptData = {
  invoiceNo: string;
  projectName: string;
  clientName?: string | null;
  projectCode?: string | null;
  amount: number;
  paidAmount: number;
  method: string;
  status: string;
  paidDate?: string | null;
  vendorName?: string | null;
};

const COMPANY = {
  name: "SANTOSHI INTERIOR",
  legal: "Santoshi Interior Pvt. Ltd.",
  address: "Mes Junction, Vidhyanagar Colony, Goa, Sancoale, Goa 403726",
  gst: "30LJIPS0941L1ZV",
  tagline: "INTERIORS FOR A BETTER TOMORROW",
  footerTag: "BUILDING SPACES | BUILDING TRUST",
  logoPath: "/images/logo/santoshi-interiors.jpg",
};

const LOGO_MAX_W = 148;
const LOGO_MAX_H = 46;

function pdfText(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function formatINR(amount: number) {
  const n = Math.round(Number(amount) || 0);
  const raw = String(n);
  const withCommas = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs ${withCommas}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  return `${day}-${mon}-${d.getFullYear()}`;
}

function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Rupees Zero Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (num: number) => {
    if (num < 20) return ones[num];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
  };

  const threeDigits = (num: number) => {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    if (h && rest) return `${ones[h]} Hundred ${twoDigits(rest)}`;
    if (h) return `${ones[h]} Hundred`;
    return twoDigits(rest);
  };

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return `Rupees ${parts.join(" ")} Only`;
}

function readJpegSize(bytes: Uint8Array): { width: number; height: number } {
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height };
    }
    i += 2 + length;
  }
  return { width: 400, height: 120 };
}

async function loadLogo(): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const res = await fetch(`${window.location.origin}${COMPANY.logoPath}`);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    const size = readJpegSize(bytes);
    return { bytes, width: size.width, height: size.height };
  } catch {
    return null;
  }
}

function asciiToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}

function buildDlpReceiptPdf(
  data: DlpReceiptData,
  logo: { bytes: Uint8Array; width: number; height: number } | null
) {
  const pageW = 595;
  const pageH = 842;
  const margin = 40;
  let ops = "";

  const textAt = (x: number, yy: number, text: string, size = 10, bold = false) => {
    ops += `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${pdfText(text)}) Tj ET\n`;
  };

  const fillRect = (x: number, yy: number, w: number, h: number, r: number, g: number, b: number) => {
    ops += `${r} ${g} ${b} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f 0 0 0 rg\n`;
  };

  const strokeRect = (
    x: number,
    yy: number,
    w: number,
    h: number,
    r = 0.78,
    g = 0.72,
    b = 0.64,
    width = 0.9
  ) => {
    ops += `${r} ${g} ${b} RG ${width} w ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S 0 0 0 RG\n`;
  };

  const fillCircle = (cx: number, cy: number, radius: number, r: number, g: number, b: number) => {
    const k = 0.5522847498 * radius;
    ops += `${r} ${g} ${b} rg `;
    ops += `${(cx + radius).toFixed(2)} ${cy.toFixed(2)} m `;
    ops += `${(cx + radius).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy + radius).toFixed(2)} ${cx.toFixed(2)} ${(cy + radius).toFixed(2)} c `;
    ops += `${(cx - k).toFixed(2)} ${(cy + radius).toFixed(2)} ${(cx - radius).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - radius).toFixed(2)} ${cy.toFixed(2)} c `;
    ops += `${(cx - radius).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy - radius).toFixed(2)} ${cx.toFixed(2)} ${(cy - radius).toFixed(2)} c `;
    ops += `${(cx + k).toFixed(2)} ${(cy - radius).toFixed(2)} ${(cx + radius).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + radius).toFixed(2)} ${cy.toFixed(2)} c f 0 0 0 rg\n`;
  };

  /** Soft gold wave header */
  fillRect(0, pageH - 118, pageW, 118, 0.93, 0.88, 0.78);
  ops += "0.86 0.76 0.58 rg ";
  ops += `0 ${(pageH - 78).toFixed(2)} m ${pageW * 0.28} ${(pageH - 18).toFixed(2)} ${pageW * 0.55} ${(pageH - 130).toFixed(2)} ${pageW} ${(pageH - 52).toFixed(2)} c `;
  ops += `${pageW} ${pageH} l 0 ${pageH} l h f 0 0 0 rg\n`;
  fillRect(0, pageH - 4, pageW, 4, 0.72, 0.58, 0.38);

  let logoDrawW = 0;
  let logoDrawH = 0;
  if (logo) {
    const scale = Math.min(LOGO_MAX_W / logo.width, LOGO_MAX_H / logo.height);
    logoDrawW = logo.width * scale;
    logoDrawH = logo.height * scale;
    const logoX = margin;
    const logoY = pageH - 28 - logoDrawH;
    ops += `q ${logoDrawW.toFixed(2)} 0 0 ${logoDrawH.toFixed(2)} ${logoX.toFixed(2)} ${logoY.toFixed(2)} cm /Im1 Do Q\n`;
    textAt(margin, pageH - 28 - logoDrawH - 12, COMPANY.tagline, 7);
  } else {
    textAt(margin, pageH - 36, COMPANY.name, 16, true);
    textAt(margin, pageH - 52, COMPANY.tagline, 8);
  }

  textAt(pageW - margin - 118, pageH - 34, "OFFICIAL RECEIPT", 11, true);
  textAt(pageW - margin - 118, pageH - 50, data.invoiceNo || "-", 9);

  /** Company + date row */
  let y = pageH - 148;
  textAt(margin, y, COMPANY.legal, 11, true);
  y -= 13;
  textAt(margin, y, COMPANY.address, 8);
  y -= 12;
  textAt(margin, y, `GSTIN: ${COMPANY.gst}`, 8);

  const dateBoxW = 168;
  const dateBoxH = 34;
  const dateBoxX = pageW - margin - dateBoxW;
  const dateBoxY = pageH - 168;
  fillRect(dateBoxX, dateBoxY, dateBoxW, dateBoxH, 0.99, 0.98, 0.96);
  strokeRect(dateBoxX, dateBoxY, dateBoxW, dateBoxH, 0.78, 0.68, 0.5, 1);
  fillCircle(dateBoxX + 16, dateBoxY + 17, 8, 0.9, 0.82, 0.68);
  textAt(dateBoxX + 12.5, dateBoxY + 14, "D", 8, true);
  textAt(dateBoxX + 30, dateBoxY + 19, "Receipt Date", 7);
  textAt(dateBoxX + 30, dateBoxY + 8, formatDate(data.paidDate), 9, true);

  /** Amount + status cards */
  y = pageH - 205;
  const cardGap = 12;
  const cardW = (pageW - margin * 2 - cardGap) / 2;
  const cardH = 58;
  const cardY = y - cardH;

  fillRect(margin, cardY, cardW, cardH, 0.9, 0.96, 0.92);
  strokeRect(margin, cardY, cardW, cardH, 0.55, 0.72, 0.6, 1);
  fillCircle(margin + 22, cardY + cardH / 2, 12, 0.22, 0.55, 0.38);
  textAt(margin + 16, cardY + cardH / 2 - 3, "Rs", 8, true);
  textAt(margin + 42, cardY + 36, "Amount received", 8);
  textAt(margin + 42, cardY + 20, formatINR(data.paidAmount), 14, true);
  textAt(margin + 42, cardY + 8, amountInWords(data.paidAmount), 7);

  const rightX = margin + cardW + cardGap;
  fillRect(rightX, cardY, cardW, cardH, 0.9, 0.96, 0.92);
  strokeRect(rightX, cardY, cardW, cardH, 0.55, 0.72, 0.6, 1);
  fillCircle(rightX + 22, cardY + cardH / 2, 12, 0.22, 0.55, 0.38);
  ops += "1 1 1 RG 1.6 w ";
  ops += `${(rightX + 16).toFixed(2)} ${(cardY + cardH / 2 - 1).toFixed(2)} m `;
  ops += `${(rightX + 20).toFixed(2)} ${(cardY + cardH / 2 - 5).toFixed(2)} l `;
  ops += `${(rightX + 29).toFixed(2)} ${(cardY + cardH / 2 + 5).toFixed(2)} l S 0 0 0 RG\n`;
  textAt(rightX + 42, cardY + 36, "Status", 8);
  textAt(rightX + 42, cardY + 20, String(data.status || "PAID").toUpperCase(), 14, true);
  textAt(rightX + 42, cardY + 8, "Payment Successfully Received", 7);

  /** Settlement details */
  y = cardY - 28;
  const tableX = margin;
  const tableW = pageW - margin * 2;
  const rows: Array<[string, string]> = [
    ["Receipt no.", data.invoiceNo || "-"],
    ["Project", data.projectName || "-"],
    ["Project ID", data.projectCode || "-"],
    ["Client", data.clientName || "-"],
    ["Vendor", data.vendorName || "-"],
    ["Payment date", formatDate(data.paidDate)],
    ["Payment mode", data.method || "-"],
    ["DLP amount", formatINR(data.amount)],
    ["Amount received", formatINR(data.paidAmount)],
  ];
  const rowH = 18;
  const headerH = 26;
  const tableH = headerH + rows.length * rowH + 4;
  const tableY = y - tableH;

  fillRect(tableX, tableY + tableH - headerH, tableW, headerH, 0.82, 0.7, 0.5);
  textAt(tableX + 12, tableY + tableH - 17, "Settlement details", 10, true);
  fillRect(tableX, tableY, tableW, tableH - headerH, 1, 1, 1);
  strokeRect(tableX, tableY, tableW, tableH, 0.82, 0.7, 0.5, 1);

  let rowY = tableY + tableH - headerH - 13;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      fillRect(tableX + 1, rowY - 5, tableW - 2, rowH, 0.97, 0.96, 0.94);
    }
    textAt(tableX + 12, rowY, label, 8);
    textAt(tableX + 150, rowY, value, 9, true);
    rowY -= rowH;
  });

  /** Notes */
  y = tableY - 18;
  const noteH = 42;
  const noteY = y - noteH;
  fillRect(margin, noteY, tableW, noteH, 0.93, 0.96, 0.99);
  strokeRect(margin, noteY, tableW, noteH, 0.62, 0.74, 0.86, 1);
  fillCircle(margin + 16, noteY + noteH / 2, 8, 0.35, 0.55, 0.78);
  textAt(margin + 13, noteY + noteH / 2 - 3, "i", 9, true);
  textAt(margin + 32, noteY + 26, "Notes", 8, true);
  textAt(
    margin + 32,
    noteY + 14,
    "This receipt confirms release of Defect Liability Period (DLP) holding by the company",
    7
  );
  textAt(margin + 32, noteY + 4, "against the vendor project budget. Please retain for your records.", 7);

  /** Signatures */
  y = noteY - 20;
  const sigH = 72;
  const sigW = (tableW - 12) / 2;
  const sigY = y - sigH;

  fillRect(margin, sigY, sigW, sigH, 0.99, 0.98, 0.96);
  strokeRect(margin, sigY, sigW, sigH, 0.8, 0.72, 0.6, 1);
  textAt(margin + 12, sigY + sigH - 16, "Authorized signatory", 8, true);
  textAt(margin + 12, sigY + sigH - 30, COMPANY.legal, 8);
  ops += "0.78 0.72 0.64 RG 0.8 w ";
  ops += `${(margin + 12).toFixed(2)} ${(sigY + 22).toFixed(2)} m ${(margin + sigW - 12).toFixed(2)} ${(sigY + 22).toFixed(2)} l S 0 0 0 RG\n`;
  textAt(margin + 12, sigY + 10, "Name / Signature / Stamp", 7);

  const sig2X = margin + sigW + 12;
  fillRect(sig2X, sigY, sigW, sigH, 0.99, 0.98, 0.96);
  strokeRect(sig2X, sigY, sigW, sigH, 0.8, 0.72, 0.6, 1);
  textAt(sig2X + 12, sigY + sigH - 16, "Received acknowledgement", 8, true);
  textAt(sig2X + 12, sigY + sigH - 30, "Vendor / Franchisee", 8);
  ops += "0.78 0.72 0.64 RG 0.8 w ";
  ops += `${(sig2X + 12).toFixed(2)} ${(sigY + 22).toFixed(2)} m ${(sig2X + sigW - 12).toFixed(2)} ${(sigY + 22).toFixed(2)} l S 0 0 0 RG\n`;
  textAt(sig2X + 12, sigY + 10, "Name / Signature / Stamp", 7);

  /** Footer */
  fillRect(0, 0, pageW, 36, 0.96, 0.93, 0.88);
  textAt(margin, 16, `Generated on ${formatDate(new Date().toISOString())} - Santoshi Interior CRM`, 7);
  textAt(pageW - margin - 168, 16, COMPANY.footerTag, 7, true);
  ops += "0.72 0.58 0.38 RG 1.2 w ";
  ops += `${(pageW - margin - 168).toFixed(2)} 12 m ${(pageW - margin - 168 + 54).toFixed(2)} 12 l S 0 0 0 RG\n`;

  const objects: Array<string | Uint8Array> = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(""); // Pages placeholder
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let imageId: number | null = null;
  if (logo) {
    imageId = objects.length + 1;
    const header = `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`;
    const footer = "\nendstream";
    objects.push(concatBytes([asciiToBytes(header), logo.bytes, asciiToBytes(footer)]));
  }

  const contentId = objects.length + 1;
  objects.push(`<< /Length ${ops.length} >>\nstream\n${ops}endstream`);
  const pageId = objects.length + 1;
  const xObjects = imageId ? `/XObject << /Im1 ${imageId} 0 R >>` : "";
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xObjects} >> /Contents ${contentId} 0 R >>`
  );
  objects[1] = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;

  const chunks: Uint8Array[] = [asciiToBytes("%PDF-1.4\n")];
  const offsets = [0];
  let offset = chunks[0].length;

  objects.forEach((body, index) => {
    offsets.push(offset);
    const prefix = asciiToBytes(`${index + 1} 0 obj\n`);
    const bodyBytes = typeof body === "string" ? asciiToBytes(body) : body;
    const suffix = asciiToBytes("\nendobj\n");
    chunks.push(prefix, bodyBytes, suffix);
    offset += prefix.length + bodyBytes.length + suffix.length;
  });

  const xref = offset;
  let xrefBlock = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((off) => {
    xrefBlock += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  xrefBlock += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  chunks.push(asciiToBytes(xrefBlock));

  return concatBytes(chunks);
}

export async function downloadDlpReceiptPdf(data: DlpReceiptData) {
  const logo = await loadLogo();
  const pdf = buildDlpReceiptPdf(data, logo);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.invoiceNo || "DLP-receipt"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
