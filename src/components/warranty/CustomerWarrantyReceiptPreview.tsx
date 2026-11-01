"use client";

import React from "react";
import type { CustomerWarrantyDto } from "@/services/crmApi";
import {
  formatWarrantyReceiptDate,
  openWarrantyReceiptPrintWindow,
  warrantyReceiptNumber,
} from "@/lib/warrantyReceiptPrint";
import { toastWarning } from "@/components/ui/toast/ToastHost";

type Props = {
  warranty: CustomerWarrantyDto;
  onClose: () => void;
};

export default function CustomerWarrantyReceiptPreview({ warranty, onClose }: Props) {
  const items = warranty.coverageItems || [];
  const receiptNo = warrantyReceiptNumber(warranty);

  const downloadPdf = () => {
    const ok = openWarrantyReceiptPrintWindow(warranty);
    if (!ok) {
      toastWarning("Allow pop-ups to download the PDF.");
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#f3ebe0] shadow-2xl dark:border-[#3a342c] dark:bg-[#12100e]">
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#eadfcf] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#3a342c] dark:bg-[#161411]">
          <div>
            <h3 className="text-base font-semibold text-[#1c1610] dark:text-[#f3ece2]">
              Warranty receipt preview
            </h3>
            <p className="text-sm text-[#8a7b68]">
              {receiptNo} · {warranty.project?.clientName || "Customer"} ·{" "}
              {warranty.project?.name || "Project"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex h-9 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#8a7b68]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-8">
          <div className="mx-auto max-w-[820px] overflow-hidden rounded-sm bg-white shadow-xl ring-1 ring-[#eadfcf]">
            <div className="flex flex-wrap items-start justify-between gap-4 bg-[#1c1610] px-6 py-6 text-[#f3ece2]">
              <div>
                <h1 className="text-2xl font-semibold tracking-wide">Warranty Receipt</h1>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c4a574]">
                  Customer project coverage
                </p>
                <p className="mt-2 text-sm text-[#d9cbb8]">{warranty.title}</p>
              </div>
              <div className="min-w-[180px] rounded-xl border border-[#c4a574]/40 bg-white/5 px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c4a574]">
                  Receipt
                </p>
                <p className="mt-1 text-lg font-bold">{receiptNo}</p>
                <p className="mt-1 text-xs text-[#d9cbb8]">
                  Issued: {formatWarrantyReceiptDate(warranty.createdAt || warranty.startsOn)}
                </p>
                <p className="text-xs text-[#d9cbb8]">
                  Valid: {formatWarrantyReceiptDate(warranty.startsOn)} →{" "}
                  {formatWarrantyReceiptDate(warranty.endsOn)}
                </p>
              </div>
            </div>
            <div className="h-1.5 bg-[#c4a574]" />

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1c1610]">
                    {warranty.project?.clientName || "Customer"}
                  </p>
                  {warranty.project?.phone ? (
                    <p className="mt-0.5 text-xs text-[#8a7b68]">{warranty.project.phone}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Project
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1c1610]">
                    {warranty.project?.name || "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8a7b68]">
                    {items.length} material{items.length === 1 ? "" : "s"} covered
                  </p>
                </div>
              </div>

              {warranty.coverageSummary ? (
                <div className="rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Coverage summary
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#5c5348]">
                    {warranty.coverageSummary}
                  </p>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-[#eadfcf]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#1c1610] text-[10px] uppercase tracking-[0.12em] text-[#e8d5b5]">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium">#</th>
                      <th className="px-3 py-2.5 text-left font-medium">Material</th>
                      <th className="px-3 py-2.5 text-left font-medium">What we cover</th>
                      <th className="px-3 py-2.5 text-left font-medium">Ends on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[#8a7b68]">
                          No materials listed on this warranty.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr
                          key={`${item.title}-${index}`}
                          className="border-t border-[#f0e8db] odd:bg-white even:bg-[#fbf8f3]"
                        >
                          <td className="px-3 py-3 text-center text-[#8a7b68]">{index + 1}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[#1c1610]">{item.title}</p>
                            {item.vendorName ? (
                              <p className="text-xs text-[#8a7b68]">
                                From vendor: {item.vendorName}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-[#5c5348]">
                            {item.description || "—"}
                          </td>
                          <td className="px-3 py-3 text-[#5c5348]">
                            {formatWarrantyReceiptDate(item.endsOn || warranty.endsOn)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {warranty.notes ? (
                <div className="rounded-xl border border-[#eadfcf] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#5c5348]">{warranty.notes}</p>
                </div>
              ) : null}

              <div className="grid gap-10 pt-6 sm:grid-cols-2">
                <div>
                  <div className="mb-9 h-px w-40 bg-[#cfc3b0]" />
                  <p className="text-sm font-semibold text-[#1c1610]">Customer acknowledgement</p>
                  <p className="text-xs text-[#8a7b68]">Name & signature</p>
                </div>
                <div className="sm:text-right">
                  <div className="mb-9 ml-auto h-px w-40 bg-[#cfc3b0]" />
                  <p className="text-sm font-semibold text-[#1c1610]">Authorized signatory</p>
                  <p className="text-xs text-[#8a7b68]">For the company</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-[#8a7b68]">
            Use <strong>Download PDF</strong> → choose “Save as PDF” in the print dialog
          </p>
        </div>
      </div>
    </div>
  );
}
