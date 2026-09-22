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
          <span>{items.length}</span>
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
                  <td className="px-2 py-2">{index + 1}</td>
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
