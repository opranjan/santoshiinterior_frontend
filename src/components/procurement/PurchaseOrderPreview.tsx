"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";

const COMPANY = {
  name: "SANTOSHI INTERIOR",
  address: "Mes Junction, Vidhyanagar Colony, Goa, Sancoale, Goa 403726",
  gst: "30LJIPS0941L1ZV",
};

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  return `${day}-${mon}-${String(d.getFullYear()).slice(-2)}`;
}

export type PreviewLine = {
  name: string;
  qty: number;
  unit: string;
  rate: number;
  total: number;
  hsn?: string;
  discountPct?: number;
  taxPct?: number;
};

export function linesFromOrder(row: {
  items?: Array<{
    name: string;
    qty?: number | null;
    unit?: string | null;
    rate?: number | null;
    discountPct?: number | null;
    taxPct?: number | null;
    hsn?: string | null;
  }>;
}): { items: PreviewLine[]; baseAmount: number; taxAmount: number; totalAmount: number } {
  const items = (row.items || [])
    .filter((item) => String(item.name || "").trim())
    .map((item) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const line = qty * rate;
      const disc = line * (Number(item.discountPct || 0) / 100);
      const tax = (line - disc) * (Number(item.taxPct || 0) / 100);
      return {
        name: item.name,
        qty,
        unit: item.unit || "",
        rate,
        total: line - disc + tax,
        hsn: item.hsn || "",
        discountPct: Number(item.discountPct || 0),
        taxPct: Number(item.taxPct || 0),
      };
    });
  const baseAmount = items.reduce((sum, item) => sum + item.qty * item.rate * (1 - (item.discountPct || 0) / 100), 0);
  const taxAmount = items.reduce((sum, item) => {
    const base = item.qty * item.rate * (1 - (item.discountPct || 0) / 100);
    return sum + base * ((item.taxPct || 0) / 100);
  }, 0);
  return { items, baseAmount, taxAmount, totalAmount: baseAmount + taxAmount };
}

export function PurchaseOrderDocument({
  kindLabel,
  code,
  orderDate,
  deliveryDate,
  projectName,
  shippingAddress,
  vendorName,
  vendorBilling,
  vendorGst,
  items,
  baseAmount,
  taxAmount,
  totalAmount,
  detailed,
  serialOffset = 0,
  itemCount,
}: {
  kindLabel: string;
  code?: string | null;
  orderDate?: string | null;
  deliveryDate?: string | null;
  projectName?: string | null;
  shippingAddress?: string | null;
  vendorName?: string | null;
  vendorBilling?: string | null;
  vendorGst?: string | null;
  items: PreviewLine[];
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  detailed?: boolean;
  serialOffset?: number;
  itemCount?: number;
}) {
  return (
    <div className="bg-white px-6 py-5 text-sm text-gray-800">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center bg-black text-white">
            <svg viewBox="0 0 40 32" className="h-7 w-9 fill-white" aria-hidden>
              <path d="M20 2L2 16h5v14h10V20h6v10h10V16h5L20 2z" />
            </svg>
            <p className="mt-0.5 text-center text-[5px] font-semibold uppercase leading-tight tracking-wide">
              Santoshi
              <br />
              Interiors
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">{COMPANY.name}</h2>
            <p className="mt-1 max-w-md text-[11px] leading-4 text-gray-600">
              {COMPANY.address} GST NO {COMPANY.gst},
              <br />
              GST: {COMPANY.gst},
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap text-sm font-semibold">{kindLabel}</p>
          {code ? <p className="text-xs text-gray-500">({code})</p> : null}
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-2 border-b border-gray-200 py-4 text-xs sm:grid-cols-2">
        <div className="grid grid-cols-[110px_1fr] gap-y-1">
          <span className="font-semibold">PO Amount:</span>
          <span>{money(totalAmount)}</span>
          <span className="font-semibold">No. of items:</span>
          <span>{itemCount ?? items.length}</span>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-y-1">
          <span className="font-semibold">Order Date:</span>
          <span>{formatDate(orderDate)}</span>
          <span className="font-semibold">Delivery Date:</span>
          <span>{formatDate(deliveryDate)}</span>
          <span className="font-semibold">Project Name:</span>
          <span>{projectName || "—"}</span>
        </div>
      </div>

      <div className="grid border-b border-gray-200 text-xs sm:grid-cols-2">
        <div className="border-gray-200 py-3 pr-4 sm:border-r">
          <p className="font-semibold">Shipping Address:</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-700">{shippingAddress || "—"}</p>
          <p className="mt-1 text-gray-700">GST: {COMPANY.gst},</p>
        </div>
        <div className="py-3 sm:pl-4">
          <p className="font-semibold">Vendor Billing Address:</p>
          <p className="mt-1 text-gray-700">{vendorBilling || vendorName || "—"}</p>
          {vendorGst ? <p className="mt-1 text-gray-700">GST: {vendorGst}</p> : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-2 py-2 font-semibold">S.No</th>
              <th className="px-2 py-2 font-semibold">Description</th>
              {detailed ? <th className="px-2 py-2 font-semibold">HSN</th> : null}
              <th className="px-2 py-2 font-semibold">Qty</th>
              <th className="px-2 py-2 font-semibold">UOM</th>
              <th className="px-2 py-2 font-semibold">Rate</th>
              {detailed ? <th className="px-2 py-2 font-semibold">% Disc</th> : null}
              {detailed ? <th className="px-2 py-2 font-semibold">% Tax</th> : null}
              <th className="px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={detailed ? 9 : 6} className="h-12 px-2" />
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="border-t border-gray-100">
                  <td className="px-2 py-2">{serialOffset + index + 1}</td>
                  <td className="px-2 py-2">{item.name}</td>
                  {detailed ? <td className="px-2 py-2">{item.hsn || ""}</td> : null}
                  <td className="px-2 py-2">{item.qty}</td>
                  <td className="px-2 py-2">{item.unit || "—"}</td>
                  <td className="px-2 py-2">{item.rate}</td>
                  {detailed ? <td className="px-2 py-2">{item.discountPct || 0}</td> : null}
                  {detailed ? <td className="px-2 py-2">{item.taxPct || 0}</td> : null}
                  <td className="px-2 py-2 text-right">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!detailed ? (
        <div className="mt-5 ml-auto w-full max-w-xs overflow-hidden rounded-md border border-gray-300 text-sm">
          <div className="grid grid-cols-2 border-b border-gray-300">
            <p className="px-4 py-3 font-medium">Base Amount</p>
            <p className="px-4 py-3 text-right">{money(baseAmount)}</p>
          </div>
          <div className="grid grid-cols-2 border-b border-gray-300">
            <p className="px-4 py-3 font-medium">Total Tax Amount</p>
            <p className="px-4 py-3 text-right">{money(taxAmount)}</p>
          </div>
          <div className="grid grid-cols-2">
            <p className="px-4 py-3 font-medium">Total Amount</p>
            <p className="px-4 py-3 text-right">{money(totalAmount)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type OrderDownloadRow = {
  kind?: string | null;
  code?: string | null;
  title?: string | null;
  orderDate?: string | null;
  createdAt?: string;
  expectedDate?: string | null;
  project?: { name?: string | null } | null;
  shippingAddress?: string | null;
  vendor?: string | null;
  vendorBillingAddress?: string | null;
  vendorRecord?: { name?: string | null; gstin?: string | null } | null;
  items?: Array<{
    name: string;
    qty?: number | null;
    unit?: string | null;
    rate?: number | null;
    discountPct?: number | null;
    taxPct?: number | null;
    hsn?: string | null;
  }>;
};

function pdfText(value: string) {
  return String(value || "")
    .replace(/₹/g, "Rs ")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdf(value: string, maxChars: number) {
  const text = String(value || "").replace(/₹/g, "Rs ").replace(/\s+/g, " ").trim() || " ";
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else if (word.length > maxChars) {
      if (current) lines.push(current);
      for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      current = "";
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function buildOrderPdf(row: OrderDownloadRow) {
  const totals = linesFromOrder(row);
  const kindLabel = row.kind === "WO" ? "Work Order" : "Purchase Order";
  const vendorName = row.vendorRecord?.name || row.vendor || "";
  const vendorBilling = row.vendorBillingAddress || vendorName || "-";
  const pageW = 595;
  const pageH = 842;
  const margin = 36;
  const cols = [
    { x: 36, w: 28, align: "left" as const },
    { x: 64, w: 150, align: "left" as const },
    { x: 214, w: 48, align: "left" as const },
    { x: 262, w: 36, align: "right" as const },
    { x: 298, w: 36, align: "left" as const },
    { x: 334, w: 50, align: "right" as const },
    { x: 384, w: 40, align: "right" as const },
    { x: 424, w: 40, align: "right" as const },
    { x: 464, w: 95, align: "right" as const },
  ];
  const headers = ["S.No", "Description", "HSN", "Qty", "UOM", "Rate", "% Disc", "% Tax", "Total"];

  const pages: string[] = [];
  let ops = "";
  let y = 0;

  const startPage = () => {
    ops = "";
    y = pageH - 48;
  };
  const textAt = (x: number, yy: number, text: string, size = 10, bold = false) => {
    ops += `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${pdfText(text)}) Tj ET\n`;
  };
  const flushPage = () => {
    pages.push(ops);
  };

  startPage();
  textAt(margin, y, COMPANY.name, 14, true);
  textAt(pageW - margin - 140, y, kindLabel, 12, true);
  y -= 14;
  textAt(pageW - margin - 140, y, row.code || "", 9);
  wrapPdf(`${COMPANY.address} GST: ${COMPANY.gst}`, 78).forEach((line) => {
    y -= 12;
    textAt(margin, y, line, 8);
  });
  y -= 18;
  textAt(margin, y, `PO Amount: ${money(totals.totalAmount).replace("₹", "Rs")}`, 10, true);
  textAt(320, y, `Order Date: ${formatDate(row.orderDate || row.createdAt).replace("—", "-")}`, 10);
  y -= 14;
  textAt(margin, y, `No. of items: ${totals.items.length}`, 10);
  textAt(320, y, `Delivery Date: ${formatDate(row.expectedDate).replace("—", "-")}`, 10);
  y -= 14;
  textAt(320, y, `Project: ${row.project?.name || "—"}`, 10);
  y -= 18;
  textAt(margin, y, "Shipping Address:", 9, true);
  textAt(320, y, "Vendor Billing Address:", 9, true);
  y -= 12;
  const shipLines = wrapPdf(row.shippingAddress || "-", 42);
  const billLines = wrapPdf(
    `${vendorBilling}${row.vendorRecord?.gstin ? ` GST: ${row.vendorRecord.gstin}` : ""}`,
    42
  );
  const addrRows = Math.max(shipLines.length, billLines.length);
  for (let i = 0; i < addrRows; i += 1) {
    if (shipLines[i]) textAt(margin, y, shipLines[i], 8);
    if (billLines[i]) textAt(320, y, billLines[i], 8);
    y -= 11;
  }
  y -= 10;

  const drawHeader = () => {
    ops += `0.93 0.93 0.93 rg ${margin} ${y - 4} ${pageW - margin * 2} 16 re f 0 0 0 rg\n`;
    headers.forEach((label, index) => {
      const col = cols[index];
      textAt(col.x, y, label, 8, true);
    });
    y -= 16;
  };
  drawHeader();

  const itemRows =
    totals.items.length > 0
      ? totals.items.map((item, index) => [
          String(index + 1),
          item.name,
          item.hsn || "",
          String(item.qty),
          item.unit || "",
          String(item.rate),
          String(item.discountPct || 0),
          String(item.taxPct || 0),
          Number(item.total).toFixed(2),
        ])
      : [["", "No items", "", "", "", "", "", "", ""]];

  itemRows.forEach((cells) => {
    const descLines = wrapPdf(cells[1], 32);
    const rowH = Math.max(14, descLines.length * 11 + 4);
    if (y - rowH < 60) {
      flushPage();
      startPage();
      drawHeader();
    }
    descLines.forEach((line, lineIndex) => {
      const lineY = y - lineIndex * 11;
      cells.forEach((cell, index) => {
        if (index === 1) {
          if (line) textAt(cols[1].x, lineY, line, 8);
          return;
        }
        if (lineIndex === 0) textAt(cols[index].x, lineY, cell, 8);
      });
    });
    y -= rowH;
  });

  y -= 10;
  if (y < 80) {
    flushPage();
    startPage();
  }
  textAt(pageW - margin - 180, y, `Total: ${money(totals.totalAmount).replace("₹", "Rs")}`, 11, true);
  flushPage();

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const fontRegularId = 3;
  const fontBoldId = 4;
  const pageIds: number[] = [];
  objects.push(""); // pages placeholder at index 1 (obj 2)
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((content) => {
    const contentId = objects.length + 1;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
    const pageId = objects.length + 1;
    pageIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

export function downloadPurchaseOrderDocument(row: OrderDownloadRow) {
  const pdf = buildOrderPdf(row);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${row.code || "order"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function PurchaseOrderPreview({
  open,
  onClose,
  kindLabel,
  orderDate,
  deliveryDate,
  projectName,
  shippingAddress,
  vendorName,
  vendorBilling,
  vendorGst,
  items,
  baseAmount,
  taxAmount,
  totalAmount,
}: {
  open: boolean;
  onClose: () => void;
  kindLabel: string;
  orderDate?: string | null;
  deliveryDate?: string | null;
  projectName?: string | null;
  shippingAddress?: string | null;
  vendorName?: string | null;
  vendorBilling?: string | null;
  vendorGst?: string | null;
  items: PreviewLine[];
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      showCloseButton
      className="w-full max-w-4xl overflow-hidden bg-white p-0 shadow-2xl"
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      <div className="max-h-[90vh] overflow-y-auto">
        <PurchaseOrderDocument
          kindLabel={kindLabel}
          orderDate={orderDate}
          deliveryDate={deliveryDate}
          projectName={projectName}
          shippingAddress={shippingAddress}
          vendorName={vendorName}
          vendorBilling={vendorBilling}
          vendorGst={vendorGst}
          items={items}
          baseAmount={baseAmount}
          taxAmount={taxAmount}
          totalAmount={totalAmount}
        />
      </div>
    </Modal>
  );
}
