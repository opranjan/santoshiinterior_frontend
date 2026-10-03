"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { useAuth } from "@/context/AuthContext";
import { designAssetUrl } from "@/lib/designAssets";
import { rfqApi, type RfqDto, type RfqItemDto } from "@/services/crmApi";

const UOMS = ["NOS", "PCS", "SQFT", "RFT", "CFT", "MTR", "KG", "BOX", "SET", "ROLL", "LS"];
const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-white px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function blankRow(): RfqItemDto {
  return { name: "", code: "", uom: "", qty: 0, remark: "" };
}

export default function RfqEditor({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [row, setRow] = useState<RfqDto | null>(null);
  const [title, setTitle] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [items, setItems] = useState<RfqItemDto[]>([blankRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await rfqApi.get(id);
      setRow(data);
      setTitle(data.name || "");
      setExpectedDelivery(data.expectedDelivery ? data.expectedDelivery.slice(0, 10) : "");
      setItems(data.items?.length ? data.items : [blankRow()]);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const createdByYou = Boolean(user?.id && row?.createdBy?.id === user.id);
  const createdByLabel = createdByYou ? "You" : row?.createdBy?.name || "Procurement";

  const patchItem = (index: number, patch: Partial<RfqItemDto>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, blankRow()]);

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [blankRow()];
    });
  };

  const applyBulk = () => {
    const parsed = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t|]/).map((part) => part.trim());
        return {
          name: parts[0] || "",
          code: parts[1] || "",
          uom: parts[2] || "",
          qty: Number(parts[3] || 0),
          remark: parts[4] || "",
        };
      });
    if (parsed.length) {
      setItems((prev) => {
        const filled = prev.filter((item) => item.name.trim());
        const next = [...filled, ...parsed];
        return next.length ? next : [blankRow()];
      });
    }
    setBulkText("");
    setBulkOpen(false);
  };

  const payload = () => ({
    name: title.trim(),
    expectedDelivery: expectedDelivery || null,
    items: items.map((item) => ({
      name: item.name,
      code: item.code,
      uom: item.uom,
      qty: Number(item.qty || 0),
      remark: item.remark,
    })),
  });

  const raise = async () => {
    if (!title.trim()) {
      toastWarning("Title is required.");
      return;
    }
    if (!expectedDelivery) {
      toastWarning("Expected delivery date is required.");
      return;
    }
    if (!items.some((item) => item.name.trim())) {
      toastWarning("Add at least one item with a name.");
      return;
    }
    try {
      setSaving(true);
      await rfqApi.update(id, payload());
      toastSuccess("RFQ raised.");
      router.push("/operations/procurement/rfq");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to raise RFQ");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (isNew) {
      try {
        await rfqApi.remove(id);
      } catch {
        /* still leave */
      }
    }
    router.push("/operations/procurement/rfq");
  };

  const uploadDocs = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    try {
      const updated = await rfqApi.uploadFiles(id, Array.from(fileList));
      setRow(updated);
      toastSuccess("Document uploaded.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to upload documents");
    }
  };

  if (loading) return <p className="text-sm text-[#8a7b68]">Loading RFQ...</p>;
  if (!row) return <p className="text-sm text-[#8a7b68]">RFQ not found</p>;

  return (
    <div className="space-y-5">
      <Link
        href="/operations/procurement/rfq"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
      >
        <span aria-hidden>←</span>
        RFQ <span className="font-medium text-[#c4a574]">/ {isNew ? "New" : row.code}</span>
      </Link>

      <div className="flex flex-row items-stretch gap-4 rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="min-w-0 flex-1 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
          />
          <div className="grid gap-4 text-sm text-[#1c1610] dark:text-[#f3ece2] sm:grid-cols-3">
            <div>
              <span className="text-[#8a7b68]">Project name: </span>
              <span className="font-medium">{row.project?.name || "—"}</span>
            </div>
            <div>
              <span className="text-[#8a7b68]">Created by: </span>
              <span className="font-medium">{createdByLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
              <span className="text-[#8a7b68]">Expected delivery:</span>
              <span className="font-medium">{expectedDelivery ? formatDate(expectedDelivery) : "—"}</span>
              <DatePickerField
                id={`rfq-expected-delivery-${id}`}
                value={expectedDelivery}
                onChange={setExpectedDelivery}
                variant="icon"
              />
            </div>
            <div>
              <span className="text-[#8a7b68]">Items: </span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div>
              <span className="text-[#8a7b68]">Created date: </span>
              <span className="font-medium">{formatDate(row.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#8a7b68]">Attached documents</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void uploadDocs(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-full bg-[#1c1610] px-3 py-1 text-xs font-medium text-[#e8d5b5]"
            >
              ⊕ Add New doc
            </button>
            {(row.files || []).map((file) => (
              <a
                key={file.id}
                href={designAssetUrl(file.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="truncate rounded-full bg-white px-3 py-1 text-xs text-[#6b645b] ring-1 ring-[#eadfcf] dark:bg-[#1a1714] dark:text-[#d8d0c3] dark:ring-[#3a342c]"
              >
                {file.fileName}
              </a>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 px-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void raise()}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[#1c1610] text-[10px] font-semibold leading-tight text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          >
            <span className="text-lg leading-none">✓</span>
            Raise
            <br />
            Request
          </button>
          <button type="button" onClick={() => void cancel()} className="text-sm text-[#8a7b68]">
            Cancel
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#8a7b68]">Add or delete items from this RFQ</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] px-4 text-sm font-medium text-[#9a7748] dark:border-[#3a342c]"
          >
            Add bulk items
          </button>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-medium text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          >
            + Add Item
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] dark:border-[#3a342c]">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:bg-[#1c1914]">
            <tr>
              <th className="px-3 py-3.5">S. no.</th>
              <th className="px-3 py-3.5">Item name</th>
              <th className="px-3 py-3.5">Item code</th>
              <th className="px-3 py-3.5">UOM</th>
              <th className="px-3 py-3.5">Qty</th>
              <th className="px-3 py-3.5">Remark</th>
              <th className="px-3 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                <td className="px-3 py-2 text-[#8a7b68]">{index + 1}</td>
                <td className="px-3 py-2">
                  <input
                    value={item.name}
                    placeholder="Item Name"
                    onChange={(e) => patchItem(index, { name: e.target.value })}
                    className="h-10 w-full bg-transparent text-sm outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.code}
                    placeholder="Code"
                    onChange={(e) => patchItem(index, { code: e.target.value })}
                    className="h-10 w-full bg-transparent text-sm outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.uom || ""}
                    onChange={(e) => patchItem(index, { uom: e.target.value })}
                    className="h-10 w-full bg-transparent text-sm outline-none"
                  >
                    <option value=""> </option>
                    {UOMS.map((uom) => (
                      <option key={uom} value={uom}>
                        {uom}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.qty ?? 0}
                    onChange={(e) => patchItem(index, { qty: Number(e.target.value) })}
                    className="h-10 w-20 rounded-md bg-[#fbf8f3] px-2 text-sm outline-none dark:bg-[#1c1914]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.remark || ""}
                    placeholder="Add a remark"
                    onChange={(e) => patchItem(index, { remark: e.target.value })}
                    className="h-10 w-full bg-transparent text-sm text-[#8a7b68] outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-lg text-[#9a7748] hover:text-[#1c1610]"
                    aria-label="Delete item"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        className="w-full max-w-lg overflow-hidden border border-[#eadfcf] bg-[#fdfbf7] p-0 dark:border-[#3a342c] dark:bg-[#161411]"
        showCloseButton={false}
      >
        <div className="border-b border-[#eadfcf] bg-[#fbf8f3] px-6 py-4 dark:border-[#3a342c]">
          <h3
            className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Add bulk items
          </h3>
          <p className="mt-1 text-xs text-[#8a7b68]">One item per line: Name, Code, UOM, Qty, Remark</p>
        </div>
        <div className="px-6 py-4">
        <textarea
          rows={8}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="w-full rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          placeholder="Plywood 18mm, PLY-18, SQFT, 120, Site A"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(false)}
            className="h-10 rounded-xl border border-[#eadfcf] px-4 text-sm text-[#6b645b] dark:border-[#3a342c]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyBulk}
            className="h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-medium text-[#e8d5b5]"
          >
            Add items
          </button>
        </div>
        </div>
      </Modal>
    </div>
  );
}
