"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import {
  linesFromOrder,
  PurchaseOrderDocument,
} from "@/components/procurement/PurchaseOrderPreview";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";

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
}: {
  open: boolean;
  row: PurchaseOrderDto | null;
  onClose: () => void;
  onUpdated: (row: PurchaseOrderDto) => void;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  if (!row) return null;
  const totals = linesFromOrder(row);
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
      className="w-full max-w-6xl overflow-hidden bg-white p-0 shadow-2xl"
      overlayClassName="fixed inset-0 h-full w-full bg-black/40"
    >
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-lg font-semibold">{row.title || row.code}</h3>
      </div>
      <div className="grid max-h-[80vh] min-h-[520px] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-y-auto border-r border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <button type="button" className="rounded border bg-white px-2 py-1">
              ↓
            </button>
            <span>1 / 1</span>
          </div>
          <div className="rounded-lg border bg-white shadow-sm">
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
              {...totals}
            />
          </div>
        </div>
        <div className="flex flex-col p-4">
          <div className="mb-3 flex gap-2">
            <select
              value={row.orderState}
              onChange={(e) => void patch({ orderState: e.target.value })}
              className="h-10 flex-1 rounded-lg border border-gray-200 px-2 text-sm"
            >
              {ORDER_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
            <select
              value={row.paymentState}
              onChange={(e) => void patch({ paymentState: e.target.value })}
              className="h-10 flex-1 rounded-lg border border-gray-200 px-2 text-sm"
            >
              {PAYMENT_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mb-2 text-sm font-medium text-gray-700">Comments</p>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {(row.comments || []).map((entry) => (
              <div key={entry.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[#E85D75]">{entry.user?.name || "Team"}</span>
                  <span className="text-gray-400">{formatStamp(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{entry.message}</p>
              </div>
            ))}
            {(row.comments || []).length === 0 ? <p className="text-sm text-gray-400">No comments yet.</p> : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendComment();
              }}
              placeholder="Type @ to mention someone..."
              className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E85D75]"
            />
            <button type="button" onClick={() => void sendComment()} className="h-10 w-10 rounded-lg bg-gray-100 text-gray-600">
              ➤
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/operations/procurement/acceptances/${row.id}`);
            }}
            className="mt-3 h-10 rounded-lg bg-[#E85D75] text-sm font-medium text-white"
          >
            Receive items
          </button>
        </div>
      </div>
    </Modal>
  );
}
