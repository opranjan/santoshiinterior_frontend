"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import { designAssetUrl } from "@/lib/designAssets";
import { purchaseOrdersApi, type PurchaseOrderDto, type PurchaseOrderItemDto } from "@/services/crmApi";

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

  if (loading) return <p className="text-sm text-[#8a7b68]">Loading acceptance...</p>;
  if (!row) return <p className="text-sm text-[#8a7b68]">Order not found</p>;

  const photos = (row.files || []).filter((file) => file.kind === "PHOTO" || file.kind === "RECEIPT" || !file.kind);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/operations/procurement/acceptances"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
          >
            <span aria-hidden>←</span>
            All acceptances
          </Link>
          <h1
            className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {row.code}
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">{row.title || "Receive items"}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void accept()}
          className="inline-flex h-11 w-fit shrink-0 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610] sm:self-auto"
        >
          {saving ? "Saving..." : "Accept"}
        </button>
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#f3ece2] sm:grid-cols-2">
        <p>
          <span className="text-[#8a7b68]">Number : </span>
          <span className="font-medium">{row.code}</span>
        </p>
        <p>
          <span className="text-[#8a7b68]">Vendor : </span>
          <span className="font-medium">{row.vendorRecord?.name || row.vendor}</span>
        </p>
        <p>
          <span className="text-[#8a7b68]">Name : </span>
          <span className="font-medium">{row.title}</span>
        </p>
        <p>
          <span className="text-[#8a7b68]">Delivery date : </span>
          {formatDate(row.expectedDate)}
        </p>
        <p className="sm:col-span-2">
          <span className="text-[#8a7b68]">Status : </span>
          {STATE_LABEL[row.orderState] || row.orderState}
        </p>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Receipts</p>
        <div className="flex flex-wrap gap-2">
          {photos.length === 0 ? <span className="text-sm text-[#b3a594]">—</span> : null}
          {photos.map((file) => (
            <a
              key={file.id}
              href={designAssetUrl(file.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#eadfcf] px-2 py-1 text-xs text-[#9a7748] dark:border-[#3a342c]"
            >
              {file.fileName}
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-medium text-[#9a7748] dark:border-[#3a342c] dark:bg-[#1a1714]"
        >
          + Attach photos
        </button>
        <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void attachPhotos(e.target.files)} />
        <h3
          className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Item list
        </h3>
        <label className="inline-flex items-center gap-2 text-sm text-[#6b645b]">
          <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
          Order complete
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:bg-[#1c1914]">
            <tr>
              <th className="px-3 py-3.5">S. no.</th>
              <th className="px-3 py-3.5">Description</th>
              <th className="px-3 py-3.5">Item code</th>
              <th className="px-3 py-3.5">UOM</th>
              <th className="px-3 py-3.5">Total qty</th>
              <th className="px-3 py-3.5">Received qty</th>
              <th className="px-3 py-3.5">Received</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#8a7b68]">
                  No items on this order.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                  <td className="px-3 py-3 text-[#8a7b68]">{index + 1}</td>
                  <td className="px-3 py-3 text-[#1c1610] dark:text-[#f3ece2]">{item.name}</td>
                  <td className="px-3 py-3 text-[#8a7b68]">{item.code || ""}</td>
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
                      className="h-10 w-24 rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-2 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
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
