"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import {
  downloadPurchaseOrderDocument,
  linesFromOrder,
  PurchaseOrderDocument,
} from "@/components/procurement/PurchaseOrderPreview";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";

const PAGE_SIZE = 8;

const ORDER_STATES = [
  { value: "ORDER_CREATED", label: "Order Created" },
  { value: "NOT_APPROVED", label: "Not Approved" },
  { value: "INTERNALLY_APPROVED", label: "Internally Approved" },
  { value: "ORDER_ACCEPTED", label: "Order Accepted" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered" },
  { value: "FULLY_DELIVERED", label: "Fully Delivered" },
  { value: "ORDER_REJECTED", label: "Order Rejected" },
];
const PAYMENT_STATES = [
  { value: "NOT_INITIATED", label: "Not Initiated" },
  { value: "PARTIAL", label: "Partial Done" },
  { value: "PAID", label: "Paid" },
];
const VENDOR_ORDER_STATE_VALUES = new Set([
  "ORDER_ACCEPTED",
  "PARTIALLY_DELIVERED",
  "FULLY_DELIVERED",
  "ORDER_REJECTED",
]);

function statesForVendor(current?: string) {
  const allowed = ORDER_STATES.filter((state) => VENDOR_ORDER_STATE_VALUES.has(state.value));
  const currentMeta = ORDER_STATES.find((state) => state.value === current);
  if (currentMeta && !VENDOR_ORDER_STATE_VALUES.has(currentMeta.value)) {
    return [currentMeta, ...allowed];
  }
  return allowed;
}

function formatStamp(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${mon}-${String(d.getFullYear()).slice(-2)} ${hh}:${mm} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

export default function AcceptancePreviewDrawer({
  open,
  row,
  onClose,
  onUpdated,
  showReceive = true,
  vendorView = false,
}: {
  open: boolean;
  row: PurchaseOrderDto | null;
  onClose: () => void;
  onUpdated: (row: PurchaseOrderDto) => void;
  showReceive?: boolean;
  vendorView?: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [page, setPage] = useState(1);
  const totals = linesFromOrder(row || { items: [] });
  const pages = Math.max(1, Math.ceil((totals.items.length || 1) / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = totals.items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (!row) return null;
  const vendor = row.vendorRecord;

  const patch = async (body: Record<string, unknown>) => {
    try {
      const updated = await purchaseOrdersApi.update(row.id, body);
      onUpdated(updated);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    try {
      const updated = await purchaseOrdersApi.addComment(row.id, comment.trim());
      setComment("");
      onUpdated(updated);
      toastSuccess("Comment added.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to comment");
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      showCloseButton
      className="w-full max-w-6xl overflow-hidden rounded-2xl border border-[#eadfcf] bg-white p-0 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]"
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-[#eadfcf] bg-[#fbf8f3] px-5 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]">
        <h3
          className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {row.title || row.code}
        </h3>
      </div>
      <div className="grid max-h-[80vh] min-h-[520px] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-y-auto border-r border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#1c1914]">
          <div className="mb-2 flex items-center justify-between text-xs text-[#8a7b68]">
            <button
              type="button"
                  title="Download PDF"
              onClick={() => downloadPurchaseOrderDocument(row)}
              className="rounded-lg border border-[#eadfcf] bg-white px-2 py-1 hover:bg-[#fdfbf7] dark:border-[#3a342c] dark:bg-[#161411]"
            >
              ↓
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#eadfcf] bg-white px-2 py-1 disabled:opacity-40 dark:border-[#3a342c] dark:bg-[#161411]"
              >
                ˄
              </button>
              <button
                type="button"
                disabled={currentPage >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded-lg border border-[#eadfcf] bg-white px-2 py-1 disabled:opacity-40 dark:border-[#3a342c] dark:bg-[#161411]"
              >
                ˅
              </button>
              <span>
                {currentPage} / {pages}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c]">
            <PurchaseOrderDocument
              kindLabel={row.kind === "WO" ? "Work Order" : "Purchase Order"}
              code={row.code}
              orderDate={row.orderDate || row.createdAt}
              deliveryDate={row.expectedDate}
              projectName={row.project?.name}
              shippingAddress={row.shippingAddress}
              vendorName={vendor?.name || row.vendor}
              vendorBilling={row.vendorBillingAddress || vendor?.name || row.vendor}
              vendorGst={vendor?.gstin}
              detailed
              serialOffset={(currentPage - 1) * PAGE_SIZE}
              itemCount={totals.items.length}
              items={pageItems}
              baseAmount={totals.baseAmount}
              taxAmount={totals.taxAmount}
              totalAmount={totals.totalAmount}
            />
          </div>
        </div>
        <div className="flex flex-col p-4">
          <div className="mb-3 flex gap-2">
            <label className="flex-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              Order state
              <select
                value={row.orderState}
                onChange={(e) => void patch({ orderState: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-2 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                {(vendorView ? statesForVendor(row.orderState) : ORDER_STATES).map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              Payment status
              {vendorView ? (
                <p className="mt-1 flex h-10 items-center rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-2 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]">
                  {PAYMENT_STATES.find((state) => state.value === row.paymentState)?.label || "Not Initiated"}
                </p>
              ) : (
                <select
                  value={row.paymentState}
                  onChange={(e) => void patch({ paymentState: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-2 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                >
                  {PAYMENT_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Comments</p>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {(row.comments || []).map((entry) => (
              <div key={entry.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[#9a7748]">{entry.user?.name || "Team"}</span>
                  <span className="text-[#b3a594]">{formatStamp(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-[#1c1610] dark:text-[#f3ece2]">{entry.message}</p>
              </div>
            ))}
            {(row.comments || []).length === 0 ? <p className="text-sm text-[#b3a594]">No comments yet.</p> : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendComment();
              }}
              placeholder="Type @ to mention someone..."
              className="h-10 flex-1 rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
            />
            <button type="button" onClick={() => void sendComment()} className="h-10 w-10 rounded-xl bg-[#eadfcf] text-[#1c1610] dark:bg-[#3a342c] dark:text-[#e8d5b5]">
              ➤
            </button>
          </div>
          {showReceive ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/operations/procurement/acceptances/${row.id}`);
              }}
              className="mt-3 h-10 rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
            >
              Receive items
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
