"use client";

import React from "react";
import {
  QuotationDocumentData,
  calcTotals,
  formatDate,
  formatINR,
} from "./quotationDocumentData";

type Props = {
  doc: QuotationDocumentData;
  compact?: boolean;
};

/**
 * Professional quotation document using global theme tokens
 * (brand / gray / success / error) so colors follow globals.css.
 */
export default function QuotationDocument({ doc, compact = false }: Props) {
  const totals = calcTotals(doc);
  const pad = compact ? "p-6 sm:p-8" : "p-8 sm:p-12";

  const statusClass =
    doc.status === "Accepted"
      ? "bg-success-50 text-success-700"
      : doc.status === "Rejected" || doc.status === "Expired"
      ? "bg-error-50 text-error-700"
      : "bg-brand-50 text-brand-700";

  return (
    <article
      className={`quotation-document mx-auto w-full max-w-[820px] bg-white text-gray-900 shadow-none ${pad}`}
    >
      <header className="relative overflow-hidden rounded-sm">
        <div className="bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-200 text-lg font-bold tracking-wide text-brand-800">
                SI
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                  Santoshi Interior
                </h1>
                <p className="mt-0.5 text-sm text-white/70">
                  Multi-store Interior Design &amp; Turnkey Solutions
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/55">
                  Indore · Bhopal · Ujjain
                  <br />
                  +91 98765 00000 · quotes@santoshiinterior.com
                </p>
              </div>
            </div>

            <div className="rounded-md bg-white/10 px-4 py-3 text-left sm:min-w-[200px] sm:text-right backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-200">
                Quotation
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{doc.id}</p>
              <p className="text-xs text-white/65">Version {doc.version}</p>
              <p className="mt-2 text-xs text-white/65">
                Date: {formatDate(doc.createdAt)}
              </p>
              <p className="text-xs text-white/65">
                Valid till: {formatDate(doc.validTill)}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-brand-300" />
      </header>

      <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-500">
            Bill To
          </p>
          <p className="text-base font-semibold text-gray-900">{doc.clientName}</p>
          <p className="mt-1 text-sm text-gray-500">{doc.phone}</p>
          <p className="text-sm text-gray-500">{doc.email}</p>
          {doc.address && (
            <p className="mt-1 text-sm text-gray-500">{doc.address}</p>
          )}
          <p className="mt-2 inline-flex rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
            Linked {doc.sourceType}: {doc.sourceId}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-500">
            Project Details
          </p>
          <p className="text-base font-semibold text-gray-900">{doc.title}</p>
          <p className="mt-1 text-sm text-gray-500">
            {doc.projectType} · {doc.store}
          </p>
          {doc.siteAddress && (
            <p className="text-sm text-gray-500">{doc.siteAddress}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Prepared by:{" "}
            <span className="font-medium text-gray-900">{doc.createdBy}</span>
          </p>
          <p className="mt-1 text-sm">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}
            >
              {doc.status}
            </span>
          </p>
        </div>
      </section>

      <section className="mt-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-500">
          Scope of Work
        </p>
        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-brand-50">
                {["#", "Description", "Area", "Qty", "Unit", "Rate", "Amount"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-brand-700 ${
                        h === "Qty" || h === "Rate" || h === "Amount"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr
                  key={`${item.description}-${idx}`}
                  className="border-t border-gray-100"
                >
                  <td className="px-3 py-3 align-top text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-3 align-top font-medium text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-3 py-3 align-top text-gray-500">{item.area}</td>
                  <td className="px-3 py-3 align-top text-right text-gray-500">
                    {item.qty}
                  </td>
                  <td className="px-3 py-3 align-top text-gray-500">{item.unit}</td>
                  <td className="px-3 py-3 align-top text-right text-gray-500">
                    {formatINR(item.rate)}
                  </td>
                  <td className="px-3 py-3 align-top text-right font-medium text-gray-900">
                    {formatINR(item.qty * item.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 flex justify-end">
        <div className="w-full max-w-[320px] overflow-hidden rounded-md border border-gray-200">
          <div className="space-y-2 bg-gray-50 px-4 py-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatINR(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span>- {formatINR(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>GST ({totals.gstPercent}%)</span>
              <span>{formatINR(totals.gst)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-brand-700 px-4 py-3.5 text-white">
            <span className="text-sm font-medium tracking-wide">Grand Total</span>
            <span className="text-lg font-semibold">
              {formatINR(totals.grandTotal)}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-500">
            Notes
          </p>
          <p className="text-sm leading-relaxed text-gray-500">
            {doc.notes || "—"}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-500">
            Payment Terms
          </p>
          <p className="text-sm leading-relaxed text-gray-500">
            {doc.terms || "—"}
          </p>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-8">
        <div>
          <div className="mb-10 h-px w-40 bg-gray-300" />
          <p className="text-sm font-medium text-gray-900">Client Acceptance</p>
          <p className="text-xs text-gray-400">Name &amp; Signature</p>
        </div>
        <div className="text-right">
          <div className="mb-10 ml-auto h-px w-40 bg-gray-300" />
          <p className="text-sm font-medium text-gray-900">For Santoshi Interior</p>
          <p className="text-xs text-gray-400">Authorized Signatory</p>
        </div>
      </section>

      <footer className="mt-10 border-t border-gray-200 pt-4">
        <p className="text-center text-[11px] leading-relaxed text-gray-400">
          Thank you for choosing Santoshi Interior. This quotation is confidential
          and intended solely for the named client.
          <br />
          www.santoshiinterior.com · GSTIN: 23XXXXX1234X1ZX
        </p>
      </footer>
    </article>
  );
}
