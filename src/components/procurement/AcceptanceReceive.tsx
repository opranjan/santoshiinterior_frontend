"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import { designAssetUrl } from "@/lib/designAssets";
import { purchaseOrdersApi, type PurchaseOrderDto, type PurchaseOrderItemDto } from "@/services/crmApi";

const PINK = "#E85D75";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${day}-${mon}-${String(d.getFullYear()).slice(-2)}`;
}

const STATE_LABEL: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  NOT_APPROVED: "Not Approved",
  INTERNALLY_APPROVED: "Internally Approved",
  ORDER_ACCEPTED: "Order Accepted",
  PARTIALLY_DELIVERED: "Partially Delivered",
  FULLY_DELIVERED: "Fully Delivered",
  ORDER_REJECTED: "Order Rejected",
};

export default function AcceptanceReceive({ id }: { id: string }) {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement | null>(null);
  const [row, setRow] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await purchaseOrdersApi.get(id);
    setRow(data);
    const next: Record<string, string> = {};
    const flags: Record<string, boolean> = {};
    (data.items || []).forEach((item) => {
      if (!item.id) return;
      next[item.id] = String(item.receivedQty ?? 0);
      flags[item.id] = Number(item.receivedQty || 0) >= Number(item.qty || 0) && Number(item.qty || 0) > 0;
    });
    setReceived(next);
    setChecked(flags);
    setComplete(Boolean(data.orderComplete));
    return data;
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  const items = (row?.items || []).filter((item) => item.id);

  const toggleReceived = (item: PurchaseOrderItemDto, on: boolean) => {
    if (!item.id) return;
    setChecked((prev) => ({ ...prev, [item.id as string]: on }));
    setReceived((prev) => ({
      ...prev,
      [item.id as string]: on ? String(item.qty ?? 0) : "0",
    }));
  };

  const accept = async () => {
    if (!row) return;
    try {
      setSaving(true);
      await purchaseOrdersApi.receive(row.id, {
        orderComplete: complete,
        accept: true,
        items: items.map((item) => ({
          id: item.id,
          receivedQty: Number(received[item.id as string] || 0),
        })),
      });
      toastSuccess("Order accepted.");
      router.push("/operations/procurement/acceptances");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setSaving(false);
    }
  };

  const attachPhotos = async (files: FileList | null) => {
    if (!files?.length || !row) return;
    try {
      const updated = await purchaseOrdersApi.uploadFiles(row.id, Array.from(files), "PHOTO");
      setRow(updated);
      toastSuccess("Photos attached.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading acceptance...</p>;
  if (!row) return <p className="text-sm text-gray-500">Order not found</p>;

  const photos = (row.files || []).filter((file) => file.kind === "PHOTO" || file.kind === "RECEIPT" || !file.kind);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/operations/procurement/acceptances" className="inline-flex items-center gap-2 text-xl font-semibold text-gray-800">
          <span className="text-gray-400">‹</span> Acceptance
        </Link>
        <button
          type="button"
          disabled={saving}
          onClick={() => void accept()}
          className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: PINK }}
        >
          ✓ Accept
        </button>
      </div>

      <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 sm:grid-cols-2">
        <p>
          <span className="text-gray-500">PO Number : </span>
          <span className="font-medium">{row.code}</span>
        </p>
        <p>
          <span className="text-gray-500">Vendor Name : </span>
          <span className="font-medium">{row.vendorRecord?.name || row.vendor}</span>
        </p>
        <p>
          <span className="text-gray-500">PO Name : </span>
          <span className="font-medium">{row.title}</span>
        </p>
        <p>
          <span className="text-gray-500">Delivery Date : </span>
          {formatDate(row.expectedDate)}
        </p>
        <p>
          <span className="text-gray-500">Status : </span>
          {STATE_LABEL[row.orderState] || row.orderState}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Receipts</p>
        <div className="flex flex-wrap gap-2">
          {photos.length === 0 ? <span className="text-sm text-gray-400">—</span> : null}
          {photos.map((file) => (
            <a
              key={file.id}
              href={designAssetUrl(file.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-2 py-1 text-xs text-[#2563EB]"
            >
              🗎 {file.fileName}
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className="inline-flex h-9 items-center rounded-lg border border-[#E85D75] px-3 text-sm text-[#E85D75]"
        >
          ▦ Attach Photos
        </button>
        <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void attachPhotos(e.target.files)} />
        <h3 className="text-lg font-semibold">Item List</h3>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
          Order Complete
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-3 font-medium">S.No</th>
              <th className="px-3 py-3 font-medium">Description</th>
              <th className="px-3 py-3 font-medium">Item Code</th>
              <th className="px-3 py-3 font-medium">UOM</th>
              <th className="px-3 py-3 font-medium">Total Qty</th>
              <th className="px-3 py-3 font-medium">Received Qty</th>
              <th className="px-3 py-3 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No items on this order.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-3 py-3">{item.name}</td>
                  <td className="px-3 py-3 text-gray-500">{item.code || ""}</td>
                  <td className="px-3 py-3">{item.unit || ""}</td>
                  <td className="px-3 py-3">{item.qty ?? 0}</td>
                  <td className="px-3 py-3">
                    <input
                      value={received[item.id as string] || "0"}
                      onChange={(e) => {
                        setReceived((prev) => ({ ...prev, [item.id as string]: e.target.value }));
                        setChecked((prev) => ({
                          ...prev,
                          [item.id as string]: Number(e.target.value || 0) >= Number(item.qty || 0),
                        }));
                      }}
                      className="h-10 w-24 rounded-lg border border-[#F4C4CC] bg-[#FFF5F7] px-2 text-sm outline-none"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[item.id as string])}
                      onChange={(e) => toggleReceived(item, e.target.checked)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
