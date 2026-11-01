"use client";

import Image from "next/image";
import React from "react";
import type { CustomerWarrantyDto } from "@/services/crmApi";
import {
  formatWarrantyReceiptDate,
  openWarrantyReceiptPrintWindow,
  warrantyMonthsLabel,
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
  const client = warranty.project?.clientName || "Customer";
  const project = warranty.project?.name || "Project";
  const phone = warranty.project?.phone || "";
  const location = warranty.project?.address || "";

  const downloadPdf = () => {
    const ok = openWarrantyReceiptPrintWindow(warranty);
    if (!ok) {
      toastWarning("Allow pop-ups to download the PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#ece4d8] shadow-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#e0d3c1] bg-[#f7f0e6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1c1610]">Warranty card preview</h3>
            <p className="text-sm text-[#8a7b68]">
              {receiptNo} · {client} · {project}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex h-9 items-center rounded-xl bg-[#3a271c] px-4 text-sm font-semibold text-[#f3e7d5]"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-xl border border-[#d9cbb8] bg-white px-4 text-sm font-semibold text-[#8a7b68]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-8">
          <div className="mx-auto max-w-[900px] overflow-hidden rounded-[18px] bg-[#fffdf9] shadow-[0_18px_50px_rgba(58,39,28,0.16)] ring-1 ring-[#eadfcf]">
            <div className="grid bg-gradient-to-b from-[#f7f0e6] to-[#fffdf9] md:grid-cols-[1.15fr_0.85fr]">
              <div className="px-5 pb-4 pt-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-[10px] bg-white ring-1 ring-[#eadfcf]">
                    <Image
                      src="/images/logo/santoshi-interiors.jpg"
                      alt="Santoshi Interiors"
                      fill
                      className="object-contain"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <h1 className="font-serif text-[28px] font-bold leading-none text-[#3a271c]">
                      Santoshi Interiors®
                    </h1>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b08a4a]">
                      Design · Build · Deliver
                    </p>
                  </div>
                </div>
                <div className="relative mt-4 h-[118px] overflow-hidden rounded-[14px] border border-[#eadfcf]">
                  <Image
                    src="/images/casual/hero-living-room.jpg"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="480px"
                  />
                </div>
              </div>

              <div className="relative flex flex-col justify-center bg-[#3a271c] px-8 py-8 text-[#fffdf9] [clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)] md:pl-12">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c4a574] bg-[#c4a574]/10 text-2xl text-[#c4a574]">
                  ✓
                </div>
                <h2 className="font-serif text-[34px] font-bold leading-none">Warranty Card</h2>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c4a574]">
                  Customer Project Coverage
                </p>
              </div>
            </div>

            <div className="space-y-3 px-5 pb-5 pt-2 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-[#eadfcf] bg-white px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    👤 Customer
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#2d2218]">{client}</p>
                  {phone ? <p className="mt-1 text-sm text-[#7a6f62]">{phone}</p> : null}
                </div>
                <div className="rounded-[14px] border border-[#eadfcf] bg-white px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    ▣ Project
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#2d2218]">{project}</p>
                  <p className="mt-1 text-sm text-[#7a6f62]">
                    {location ? `📍 ${location}` : warranty.title || "Customer Project Warranty"}
                  </p>
                </div>
              </div>

              <div className="grid overflow-hidden rounded-[14px] border border-[#eadfcf] bg-white sm:grid-cols-3">
                <div className="border-b border-[#f0e8db] px-4 py-3 sm:border-b-0 sm:border-r">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Warranty No.
                  </p>
                  <p className="mt-2 text-[15px] font-bold text-[#2d2218]">{receiptNo}</p>
                </div>
                <div className="border-b border-[#f0e8db] px-4 py-3 sm:border-b-0 sm:border-r">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Issued On
                  </p>
                  <p className="mt-2 text-[15px] font-bold text-[#2d2218]">
                    {formatWarrantyReceiptDate(warranty.createdAt || warranty.startsOn)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7748]">
                    Valid Till
                  </p>
                  <p className="mt-2 text-[15px] font-bold text-[#2d2218]">
                    {formatWarrantyReceiptDate(warranty.endsOn)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[14px] border border-[#eadfcf]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#3a271c] text-[10px] uppercase tracking-[0.1em] text-[#f3e7d5]">
                    <tr>
                      <th className="px-3 py-3 text-left font-bold">#</th>
                      <th className="px-3 py-3 text-left font-bold">Material / Work</th>
                      <th className="px-3 py-3 text-left font-bold">What We Cover</th>
                      <th className="px-3 py-3 text-left font-bold">Warranty Period</th>
                      <th className="px-3 py-3 text-left font-bold">Ends On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[#8a7b68]">
                          No materials listed on this warranty.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const ends = item.endsOn || warranty.endsOn;
                        return (
                          <tr
                            key={`${item.title}-${index}`}
                            className="border-t border-[#f0e8db] odd:bg-white even:bg-[#fbf7f1]"
                          >
                            <td className="px-3 py-3 text-center text-[#8a7b68]">{index + 1}</td>
                            <td className="px-3 py-3 font-bold text-[#2d2218]">{item.title}</td>
                            <td className="px-3 py-3 text-[#5c5348]">
                              {item.description || "—"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-[#f4e6d0] px-2.5 py-1 text-[11px] font-bold text-[#8a5f24]">
                                {warrantyMonthsLabel(warranty.startsOn, ends, item)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-[#5c5348]">
                              {formatWarrantyReceiptDate(ends)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr_0.75fr]">
                <div className="rounded-[14px] border border-[#eadfcf] bg-[#f7f0e6] px-4 py-3.5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#3a271c]">
                    <span className="text-[#c4a574]">✓</span> Warranty Terms
                  </h3>
                  <ul className="list-disc space-y-1.5 pl-4 text-[11px] text-[#6b645b]">
                    <li>
                      Covers manufacturing defects in workmanship and supplied materials listed
                      above.
                    </li>
                    <li>
                      Valid only for the named project and customer during the warranty period.
                    </li>
                    <li>
                      Does not cover misuse, water damage, alterations, or normal wear & tear.
                    </li>
                    <li>Claims must be raised within the warranty period with this card.</li>
                  </ul>
                </div>
                <div className="min-h-[120px] rounded-[14px] border border-[#eadfcf] bg-white px-4 py-3.5">
                  <h3 className="text-xs font-bold text-[#3a271c]">Customer Acknowledgement</h3>
                  <div className="mt-10 h-px w-full bg-[#d9cbb8]" />
                  <p className="mt-2 text-[11px] text-[#8a7b68]">Name & Signature</p>
                </div>
                <div className="min-h-[120px] rounded-[14px] border border-[#eadfcf] bg-white px-4 py-3.5 text-right">
                  <h3 className="text-xs font-bold text-[#3a271c]">Authorized Signatory</h3>
                  <div className="ml-auto mt-10 h-px w-full bg-[#d9cbb8]" />
                  <p className="mt-2 text-[11px] text-[#8a7b68]">For Santoshi Interiors</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#3a271c] px-5 py-3 text-[11px] text-[#f3e7d5]">
              <span>☎ +91 98765 43210</span>
              <span>✉ support@santoshiinteriors.in</span>
              <span>🌐 www.santoshiinteriors.in</span>
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
