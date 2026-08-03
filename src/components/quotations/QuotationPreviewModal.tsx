"use client";

import React, { useRef } from "react";
import Button from "@/components/ui/button/Button";
import type { Quotation } from "./QuotationsTable";
import QuotationDocument from "./QuotationDocument";
import {
  buildDocumentData,
  calcTotals,
  formatDate,
  formatINR,
} from "./quotationDocumentData";
import { getThemeColors } from "@/lib/theme";

type Props = {
  quotation: Quotation;
  onClose: () => void;
  onShare?: () => void;
};

function buildPrintHtml(q: Quotation) {
  const doc = buildDocumentData(q);
  const totals = calcTotals(doc);
  const t = getThemeColors();

  const rows = doc.items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td class="desc">${item.description}</td>
        <td>${item.area}</td>
        <td class="right">${item.qty}</td>
        <td>${item.unit}</td>
        <td class="right">${formatINR(item.rate)}</td>
        <td class="right amount">${formatINR(item.qty * item.rate)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${doc.id} · Santoshi Interior Quotation</title>
  <style>
    :root {
      --brand-50: ${t.brand50};
      --brand-200: ${t.brand200};
      --brand-300: ${t.brand300};
      --brand-500: ${t.brand500};
      --brand-600: ${t.brand600};
      --brand-700: ${t.brand700};
      --brand-800: ${t.brand800};
      --gray-50: ${t.gray50};
      --gray-100: ${t.gray100};
      --gray-200: ${t.gray200};
      --gray-300: ${t.gray300};
      --gray-400: ${t.gray400};
      --gray-500: ${t.gray500};
      --gray-800: ${t.gray800};
      --gray-900: ${t.gray900};
      --white: ${t.white};
    }
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--gray-900);
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: var(--white);
    }
    .sheet { max-width: 820px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, var(--brand-800) 0%, var(--brand-600) 55%, var(--brand-500) 100%);
      color: var(--white);
      padding: 28px 30px;
    }
    .header-row { display: flex; justify-content: space-between; gap: 24px; }
    .brand { display: flex; gap: 12px; align-items: flex-start; }
    .logo {
      width: 48px; height: 48px; border-radius: 6px;
      background: var(--brand-200); color: var(--brand-800);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px;
    }
    .brand h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .brand .tag { margin: 2px 0 0; color: rgba(255,255,255,0.7); font-size: 12px; }
    .brand .contact { margin-top: 8px; color: rgba(255,255,255,0.55); font-size: 11px; line-height: 1.5; }
    .meta-box {
      background: rgba(255,255,255,0.1);
      padding: 12px 14px;
      border-radius: 6px;
      min-width: 190px;
      text-align: right;
    }
    .meta-box .label {
      margin: 0;
      color: var(--brand-200);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .meta-box .id { margin: 4px 0 0; font-size: 17px; font-weight: 600; }
    .meta-box .sub { margin: 2px 0 0; color: rgba(255,255,255,0.65); font-size: 11px; }
    .accent { height: 6px; background: var(--brand-300); }
    .section { padding: 28px 8px 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .eyebrow {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--brand-500);
    }
    .name { margin: 0; font-size: 15px; font-weight: 600; color: var(--gray-900); }
    .muted { margin: 4px 0 0; color: var(--gray-500); font-size: 12px; }
    .chip {
      display: inline-block;
      margin-top: 8px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--brand-50);
      color: var(--brand-700);
      font-size: 10px;
      font-weight: 600;
    }
    .right-col { text-align: right; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid var(--gray-200);
      overflow: hidden;
    }
    thead th {
      background: var(--brand-50);
      color: var(--brand-700);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: left;
      padding: 10px;
    }
    tbody td {
      padding: 10px;
      border-top: 1px solid var(--gray-100);
      vertical-align: top;
      color: var(--gray-500);
    }
    td.desc, td.amount { color: var(--gray-900); font-weight: 600; }
    .right { text-align: right; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 18px; }
    .totals {
      width: 300px;
      border: 1px solid var(--gray-200);
      overflow: hidden;
    }
    .totals-body { background: var(--gray-50); padding: 14px 16px; }
    .totals-row { display: flex; justify-content: space-between; margin: 0 0 8px; color: var(--gray-500); }
    .totals-row:last-child { margin-bottom: 0; }
    .grand {
      background: var(--brand-700);
      color: var(--white);
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grand .label { font-size: 12px; font-weight: 500; }
    .grand .value { font-size: 16px; font-weight: 700; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
    .card {
      border: 1px solid var(--gray-200);
      background: var(--gray-50);
      border-radius: 6px;
      padding: 14px;
    }
    .card p { margin: 0; color: var(--gray-500); font-size: 12px; line-height: 1.55; }
    .signs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .sign-line {
      width: 160px;
      height: 1px;
      background: var(--gray-300);
      margin-bottom: 36px;
    }
    .sign-line.right { margin-left: auto; }
    .sign-title { margin: 0; font-size: 12px; font-weight: 600; color: var(--gray-900); }
    .sign-sub { margin: 2px 0 0; font-size: 11px; color: var(--gray-400); }
    .sign-right { text-align: right; }
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px solid var(--gray-200);
      text-align: center;
      color: var(--gray-400);
      font-size: 10px;
      line-height: 1.6;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding:16px;text-align:center;background:var(--gray-50);border-bottom:1px solid var(--gray-200);">
    <button onclick="window.print()" style="padding:10px 18px;border:0;border-radius:8px;background:var(--brand-700);color:var(--white);font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="margin-left:8px;padding:10px 18px;border:1px solid var(--gray-300);border-radius:8px;background:var(--white);cursor:pointer;">
      Close
    </button>
  </div>

  <div class="sheet">
    <div class="header">
      <div class="header-row">
        <div class="brand">
          <div class="logo">SI</div>
          <div>
            <h1>Santoshi Interior</h1>
            <p class="tag">Multi-store Interior Design &amp; Turnkey Solutions</p>
            <p class="contact">Indore · Bhopal · Ujjain<br/>+91 98765 00000 · quotes@santoshiinterior.com</p>
          </div>
        </div>
        <div class="meta-box">
          <p class="label">Quotation</p>
          <p class="id">${doc.id}</p>
          <p class="sub">Version ${doc.version}</p>
          <p class="sub">Date: ${formatDate(doc.createdAt)}</p>
          <p class="sub">Valid till: ${formatDate(doc.validTill)}</p>
        </div>
      </div>
    </div>
    <div class="accent"></div>

    <div class="section grid-2">
      <div>
        <p class="eyebrow">Bill To</p>
        <p class="name">${doc.clientName}</p>
        <p class="muted">${doc.phone}</p>
        <p class="muted">${doc.email}</p>
        <span class="chip">Linked ${doc.sourceType}: ${doc.sourceId}</span>
      </div>
      <div class="right-col">
        <p class="eyebrow">Project Details</p>
        <p class="name">${doc.title}</p>
        <p class="muted">${doc.projectType} · ${doc.store}</p>
        <p class="muted">Prepared by: ${doc.createdBy}</p>
        <p class="muted">Status: <strong>${doc.status}</strong></p>
      </div>
    </div>

    <div class="section">
      <p class="eyebrow">Scope of Work</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Area</th>
            <th class="right">Qty</th>
            <th>Unit</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-body">
          <div class="totals-row"><span>Subtotal</span><span>${formatINR(totals.subtotal)}</span></div>
          ${
            totals.discount > 0
              ? `<div class="totals-row"><span>Discount</span><span>- ${formatINR(totals.discount)}</span></div>`
              : ""
          }
          <div class="totals-row"><span>GST (${totals.gstPercent}%)</span><span>${formatINR(totals.gst)}</span></div>
        </div>
        <div class="grand">
          <span class="label">Grand Total</span>
          <span class="value">${formatINR(totals.grandTotal)}</span>
        </div>
      </div>
    </div>

    <div class="section cards">
      <div class="card">
        <p class="eyebrow">Notes</p>
        <p>${doc.notes || "—"}</p>
      </div>
      <div class="card">
        <p class="eyebrow">Payment Terms</p>
        <p>${doc.terms || "—"}</p>
      </div>
    </div>

    <div class="section signs">
      <div>
        <div class="sign-line"></div>
        <p class="sign-title">Client Acceptance</p>
        <p class="sign-sub">Name &amp; Signature</p>
      </div>
      <div class="sign-right">
        <div class="sign-line right"></div>
        <p class="sign-title">For Santoshi Interior</p>
        <p class="sign-sub">Authorized Signatory</p>
      </div>
    </div>

    <div class="section footer">
      Thank you for choosing Santoshi Interior. This quotation is confidential and intended solely for the named client.<br/>
      www.santoshiinterior.com · GSTIN: 23XXXXX1234X1ZX
    </div>
  </div>
</body>
</html>`;
}

export function openQuotationPrintWindow(quotation: Quotation) {
  const html = buildPrintHtml(quotation);
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export default function QuotationPreviewModal({
  quotation,
  onClose,
  onShare,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const doc = buildDocumentData(quotation);
  const totals = calcTotals(doc);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex shrink-0 flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Quotation Preview
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {quotation.id} · {quotation.clientName} · {formatINR(totals.grandTotal)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openQuotationPrintWindow(quotation)}
            >
              Print / Save PDF
            </Button>
            {onShare && (
              <Button size="sm" variant="outline" onClick={onShare}>
                Share
              </Button>
            )}
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto bg-gray-100 px-3 py-6 sm:px-8 dark:bg-gray-950"
        >
          <div className="mx-auto overflow-hidden rounded-sm shadow-theme-xl ring-1 ring-gray-200 dark:ring-gray-800">
            <QuotationDocument doc={doc} compact />
          </div>
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Use <strong>Print / Save PDF</strong> → choose “Save as PDF” in the print
            dialog
          </p>
        </div>
      </div>
    </div>
  );
}
