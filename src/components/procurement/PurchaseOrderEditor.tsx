"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import PurchaseOrderPreview from "@/components/procurement/PurchaseOrderPreview";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { designAssetUrl } from "@/lib/designAssets";
import {
  purchaseOrdersApi,
  type PurchaseOrderDto,
  type PurchaseOrderItemDto,
} from "@/services/crmApi";

const PINK = "#E85D75";
const fieldClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-[#E85D75]";

type DraftItem = {
  key: string;
  name: string;
  code: string;
  hsn: string;
  qty: string;
  unit: string;
  rate: string;
  discountPct: string;
  taxPct: string;
  imageUrl: string;
};

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

function toYmd(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function emptyItem(): DraftItem {
  return {
    key: `${Date.now()}-${Math.random()}`,
    name: "",
    code: "",
    hsn: "",
    qty: "",
    unit: "",
    rate: "0",
    discountPct: "",
    taxPct: "18",
    imageUrl: "",
  };
}

function fromDto(items?: PurchaseOrderItemDto[]): DraftItem[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    key: item.id || emptyItem().key,
    name: item.name || "",
    code: item.code || "",
    hsn: item.hsn || "",
    qty: item.qty != null ? String(item.qty) : "",
    unit: item.unit || "",
    rate: String(item.rate ?? 0),
    discountPct: item.discountPct ? String(item.discountPct) : "",
    taxPct: String(item.taxPct ?? 18),
    imageUrl: item.imageUrl || "",
  }));
}

export default function PurchaseOrderEditor({ id }: { id: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [row, setRow] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"items" | "payment" | "terms">("items");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = async () => {
    const data = await purchaseOrdersApi.get(id);
    setRow(data);
    setTitle(data.title || "");
    setDeliveryDate(toYmd(data.expectedDate));
    setShippingAddress(data.shippingAddress || "");
    setItems(fromDto(data.items));
    return data;
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  const namedItems = items.filter((item) => item.name.trim());
  const summary = useMemo(() => {
    let amount = 0;
    let discount = 0;
    let tax = 0;
    namedItems.forEach((item) => {
      const line = Number(item.qty || 0) * Number(item.rate || 0);
      const disc = line * (Number(item.discountPct || 0) / 100);
      const gst = (line - disc) * (Number(item.taxPct || 0) / 100);
      amount += line;
      discount += disc;
      tax += gst;
    });
    return { count: namedItems.length, amount, discount, tax, grand: amount - discount + tax };
  }, [namedItems]);

  const save = async (closeAfter = false) => {
    if (!title.trim()) {
      toastWarning("Title is required.");
      return;
    }
    try {
      setSaving(true);
      const updated = await purchaseOrdersApi.update(id, {
        title: title.trim(),
        expectedDate: deliveryDate || null,
        shippingAddress: shippingAddress || null,
        items: namedItems.map((item) => ({
          name: item.name.trim(),
          code: item.code || null,
          hsn: item.hsn || null,
          qty: Number(item.qty || 0),
          unit: item.unit || null,
          rate: Number(item.rate || 0),
          discountPct: Number(item.discountPct || 0),
          taxPct: Number(item.taxPct || 18),
          imageUrl: item.imageUrl || null,
        })),
      });
      setRow(updated);
      setItems(fromDto(updated.items));
      setEditing(false);
      toastSuccess("Order saved.");
      if (closeAfter) router.push("/operations/procurement/orders");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const updated = await purchaseOrdersApi.uploadFiles(id, Array.from(files));
      setRow(updated);
      toastSuccess("Receipt attached.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const setItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  if (loading) return <p className="text-sm text-gray-500">Loading order...</p>;
  if (!row) return <p className="text-sm text-gray-500">Order not found</p>;

  const kindLabel = row.kind === "WO" ? "Work Order" : "Purchase Order";
  const vendor = row.vendorRecord;
  const gst = vendor?.gstin ? `GST No: ${vendor.gstin}` : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Link href="/operations/procurement/orders" className="text-gray-400">
            ‹
          </Link>
          <span className="text-gray-800">{kindLabel}</span>
          <span className="text-[#E85D75]">/ {kindLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
            Default Config ▾
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-600"
          >
            Preview
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(true)}
            className="h-9 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: PINK }}
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#F4C4CC] bg-[#FFF5F7] p-4 text-sm text-gray-700">
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
            <DatePickerField id="po-editor-delivery" value={deliveryDate} onChange={setDeliveryDate} />
            <input
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className={`${fieldClass} sm:col-span-2`}
              placeholder="Shipping address"
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-800">{title || "—"}</h3>
              <button type="button" onClick={() => setEditing(true)} className="text-sm text-[#E85D75]">
                ✎ Edit
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-gray-500">Delivery date: </span>
                {formatDate(deliveryDate || row.expectedDate)}
              </p>
              <p>
                <span className="text-gray-500">Order Date: </span>
                {formatDate(row.orderDate || row.createdAt)}
              </p>
              <p>
                <span className="text-gray-500">Shipping Address: </span>
                {shippingAddress || row.shippingAddress || "—"}
              </p>
              <p>
                <span className="text-gray-500">Vendor Billing Address: </span>
                {row.vendorBillingAddress || "—"}
              </p>
              <p>
                <span className="text-gray-500">Project Name: </span>
                {row.project?.name || "Unknown"}
              </p>
              <p>
                <span className="text-gray-500">Vendor Name: </span>
                {vendor?.name || row.vendor}
                {gst ? ` - ${gst}` : ""}
              </p>
            </div>
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-gray-500">Attached Receipt :</span>
          {(row.files || []).map((file) => (
            <a
              key={file.id}
              href={designAssetUrl(file.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border bg-white px-2 py-1 text-xs"
            >
              {file.fileName}
            </a>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-[#2563EB] px-3 py-1 text-xs font-medium text-white"
          >
            + Attach new
          </button>
          <input ref={fileRef} type="file" className="hidden" multiple onChange={(e) => void attach(e.target.files)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
        <span className="text-gray-600">Purchase Order Summary :</span>
        <div className="flex flex-wrap gap-4 text-gray-700">
          <span>Item Count: {summary.count}</span>
          <span>Total Amount: {money(summary.amount)}</span>
          <span>Total Discount: {money(summary.discount)}</span>
          <span>Total Tax: {money(summary.tax)}</span>
          <span className="font-medium">Grand Total: {money(summary.grand)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              onClick={() => setTab("items")}
              className={tab === "items" ? "border-b-2 border-[#E85D75] pb-2 font-medium text-[#E85D75]" : "pb-2 text-gray-500"}
            >
              Items ({summary.count})
            </button>
            <button
              type="button"
              onClick={() => setTab("payment")}
              className={tab === "payment" ? "border-b-2 border-[#E85D75] pb-2 font-medium text-[#E85D75]" : "pb-2 text-gray-500"}
            >
              Payment Terms
            </button>
            <button
              type="button"
              onClick={() => setTab("terms")}
              className={tab === "terms" ? "border-b-2 border-[#E85D75] pb-2 font-medium text-[#E85D75]" : "pb-2 text-gray-500"}
            >
              Terms & Conditions
            </button>
          </div>
          {tab === "items" ? (
            <div className="flex items-center gap-2">
              <button type="button" className="h-9 rounded-lg border px-3 text-sm text-gray-600">
                ⚙ Columns
              </button>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                className="h-9 rounded-lg px-3 text-sm font-medium text-white"
                style={{ backgroundColor: PINK }}
              >
                + Add Item
              </button>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem(), emptyItem(), emptyItem()])}
                className="h-9 rounded-lg border border-[#F4C4CC] px-3 text-sm text-[#E85D75]"
              >
                Add Bulk Items ▾
              </button>
            </div>
          ) : null}
        </div>

        {tab === "items" ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">S. no.</th>
                  <th className="px-3 py-2 font-medium">Image</th>
                  <th className="px-3 py-2 font-medium">Item Name</th>
                  <th className="px-3 py-2 font-medium">Item code</th>
                  <th className="px-3 py-2 font-medium">HSN</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">UOM</th>
                  <th className="px-3 py-2 font-medium">rate</th>
                  <th className="px-3 py-2 font-medium">Discount%</th>
                  <th className="px-3 py-2 font-medium">Tax</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-gray-400">
                      No items yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.key} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 text-gray-400">🖼</td>
                      <td className="px-3 py-2">
                        <input
                          value={item.name}
                          onChange={(e) => setItem(item.key, { name: e.target.value })}
                          placeholder="Search Item"
                          className={`${fieldClass} ${item.name ? "" : "border-[#F4C4CC] bg-[#FFF5F7]"}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.code} onChange={(e) => setItem(item.key, { code: e.target.value })} placeholder="Enter Item Code" className={fieldClass} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.hsn} onChange={(e) => setItem(item.key, { hsn: e.target.value })} placeholder="Enter HSN" className={fieldClass} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.qty} onChange={(e) => setItem(item.key, { qty: e.target.value })} placeholder="Enter Quantity" className={`${fieldClass} ${item.qty ? "" : "border-[#F4C4CC] bg-[#FFF5F7]"}`} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.unit} onChange={(e) => setItem(item.key, { unit: e.target.value })} placeholder="Enter UOM" className={`${fieldClass} ${item.unit ? "" : "border-[#F4C4CC] bg-[#FFF5F7]"}`} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.rate} onChange={(e) => setItem(item.key, { rate: e.target.value })} className={fieldClass} />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.discountPct} onChange={(e) => setItem(item.key, { discountPct: e.target.value })} placeholder="Enter %" className={fieldClass} />
                      </td>
                      <td className="px-3 py-2">{item.taxPct || 18}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => setItems((prev) => prev.filter((rowItem) => rowItem.key !== item.key))} className="text-gray-400">
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} className="px-4 py-3 text-sm text-[#2563EB]">
              + Add Item
            </button>
          </div>
        ) : tab === "payment" ? (
          <p className="px-4 py-6 text-sm text-gray-600">{row.paymentTerms || "None"}</p>
        ) : (
          <p className="px-4 py-6 text-sm text-gray-600">{row.termsAndConditions || "None"}</p>
        )}
      </div>

      <PurchaseOrderPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        kindLabel={kindLabel}
        orderDate={row.orderDate || row.createdAt}
        deliveryDate={deliveryDate || row.expectedDate}
        projectName={row.project?.name}
        shippingAddress={shippingAddress || row.shippingAddress}
        vendorName={vendor?.name || row.vendor}
        vendorBilling={row.vendorBillingAddress || vendor?.name || row.vendor}
        vendorGst={vendor?.gstin}
        items={namedItems.map((item) => {
          const qty = Number(item.qty || 0);
          const rate = Number(item.rate || 0);
          const line = qty * rate;
          const disc = line * (Number(item.discountPct || 0) / 100);
          return { name: item.name, qty, unit: item.unit, rate, total: line - disc };
        })}
        baseAmount={summary.amount - summary.discount}
        taxAmount={summary.tax}
        totalAmount={summary.grand}
      />
    </div>
  );
}
