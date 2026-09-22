"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { useAuth } from "@/context/AuthContext";
import { designAssetUrl } from "@/lib/designAssets";
import {
  procurementRequestsApi,
  type ProcurementRequestDto,
  type ProcurementRequestItemDto,
} from "@/services/crmApi";
import CreateOrderModal from "@/components/procurement/CreateOrderModal";

const PINK = "#E85D75";
const UOMS = ["NOS", "PCS", "SQFT", "RFT", "CFT", "MTR", "KG", "BOX", "SET", "ROLL", "LS"];

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

function blankRow(): ProcurementRequestItemDto {
  return { name: "", code: "", uom: "", qty: 0, remark: "" };
}

export default function ProcurementRequestEditor({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [row, setRow] = useState<ProcurementRequestDto | null>(null);
  const [title, setTitle] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [items, setItems] = useState<ProcurementRequestItemDto[]>([blankRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await procurementRequestsApi.get(id);
      setRow(data);
      setTitle(data.name || "");
      setExpectedDelivery(data.expectedDelivery ? data.expectedDelivery.slice(0, 10) : "");
      setItems(data.items?.length ? data.items : [blankRow()]);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const isDraft = Boolean(row?.isDraft);
  const editing = isDraft || searchParams.get("edit") === "1";
  const createdByYou = Boolean(user?.id && row?.createdBy?.id === user.id);
  const createdByLabel = createdByYou ? "You" : row?.createdBy?.name || "Procurement";

  const patchItem = (index: number, patch: Partial<ProcurementRequestItemDto>) => {
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
    items: items.map((item, index) => ({
      sortOrder: index,
      name: item.name,
      code: item.code,
      uom: item.uom,
      qty: Number(item.qty || 0),
      remark: item.remark,
    })),
  });

  const validateItems = () => {
    if (!title.trim()) {
      toastWarning("Title is required.");
      return false;
    }
    if (!expectedDelivery) {
      toastWarning("Expected delivery date is required.");
      return false;
    }
    const named = items.filter((item) => item.name.trim());
    if (!named.length) {
      toastWarning("Add at least one item with a name.");
      return false;
    }
    return true;
  };

  const raise = async () => {
    if (!validateItems()) return;
    try {
      setSaving(true);
      const updated = await procurementRequestsApi.raise(id, payload());
      setRow(updated);
      toastSuccess("Request raised.");
      router.replace(`/operations/procurement/requests/${id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to raise request");
    } finally {
      setSaving(false);
    }
  };

  const saveEdits = async () => {
    if (!validateItems()) return;
    try {
      setSaving(true);
      const updated = await procurementRequestsApi.update(id, payload());
      setRow(updated);
      toastSuccess("Request saved.");
      router.replace(`/operations/procurement/requests/${id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to save request");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (isDraft) {
      try {
        await procurementRequestsApi.remove(id);
      } catch {
        /* still leave */
      }
      router.push("/operations/procurement/requests");
      return;
    }
    router.replace(`/operations/procurement/requests/${id}`);
  };

  const uploadDocs = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const updated = await procurementRequestsApi.uploadFiles(id, Array.from(files));
      setRow(updated);
      toastSuccess("Document uploaded.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to upload documents");
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading request...</p>;
  if (!row) return <p className="text-sm text-gray-500">Request not found</p>;

  if (!editing) {
    const visibleItems = row.items || [];
    const allIds = visibleItems.map((item, index) => item.id || String(index));
    const allSelected = allIds.length > 0 && allIds.every((itemId) => selected.includes(itemId));
    return (
      <div className="space-y-5">
        <Link
          href="/operations/procurement/requests"
          className="inline-flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90"
        >
          <span className="text-2xl font-normal text-gray-400">‹</span>
          Request <span className="font-medium text-[#E85D75]">/{row.code}</span>
        </Link>

        <div className="flex flex-row items-stretch gap-4 rounded-2xl border border-[#F4C4CC] bg-[#FFF6F7] p-5">
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="text-base font-semibold text-gray-800">{row.name}</h2>
            <div className="grid gap-x-6 gap-y-2 text-sm text-gray-700 sm:grid-cols-3">
              <div>
                <span className="text-gray-500">Project Name: </span>
                <span className="font-medium">{row.project?.name || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500">Request Type: </span>
                <span className="font-medium">{row.type === "SERVICE" ? "Service" : "Material"}</span>
              </div>
              <div>
                <span className="text-gray-500">Created by: </span>
                <span className="font-medium">{createdByLabel}</span>
              </div>
              <div>
                <span className="text-gray-500">Expected delivery date: </span>
                <span className="font-medium">{formatDate(row.expectedDelivery)}</span>
              </div>
              <div>
                <span className="text-gray-500">Items: </span>
                <span className="font-medium">{visibleItems.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Created date: </span>
                <span className="font-medium">{formatDate(row.createdAt)}</span>
              </div>
            </div>
            <p className="text-sm">
              <span className="font-semibold text-[#E85D75]">Remark: </span>
              <span className="text-gray-700">{row.notes || "—"}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center px-3">
            <button
              type="button"
              onClick={() => router.push(`/operations/procurement/requests/${id}?edit=1`)}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-full text-[10px] font-semibold leading-tight text-white"
              style={{ backgroundColor: PINK }}
            >
              <span className="text-lg leading-none">✎</span>
              Edit
              <br />
              Request
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#16A34A]">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-[11px] text-white">
                ✓
              </span>
              Raise Request
            </span>
            <span className="h-px w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-400 text-[11px] text-gray-500">
                2
              </span>
              Assign vendors
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInventoryOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E85D75] px-4 text-sm font-medium text-[#E85D75]"
            >
              ▤ Check materials in inventory
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/operations/procurement/rfq?requestId=${id}${
                    selected.length ? `&itemIds=${selected.join(",")}` : ""
                  }`
                )
              }
              className="h-10 rounded-lg bg-[#FDE7C7] px-4 text-sm font-semibold text-[#C2410C]"
            >
              Raise RFQ
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selected.length) {
                  toastWarning("Select at least one item.");
                  return;
                }
                setOrderOpen(true);
              }}
              className="h-10 rounded-lg bg-[#BBF7D0] px-4 text-sm font-semibold text-[#15803D]"
            >
              Create order
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? allIds : [])}
                  />
                </th>
                <th className="px-3 py-3 font-medium">S. no.</th>
                <th className="px-3 py-3 font-medium">Item Name</th>
                <th className="px-3 py-3 font-medium">Item Code</th>
                <th className="px-3 py-3 font-medium">UOM</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    No items on this request.
                  </td>
                </tr>
              ) : (
                visibleItems.map((item, index) => {
                  const itemId = item.id || String(index);
                  return (
                    <tr key={itemId} className="border-t border-gray-100">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(itemId)}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked ? [...prev, itemId] : prev.filter((value) => value !== itemId)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-3 text-gray-800">{item.name || "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{item.code || "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{item.uom || "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{item.qty ?? 0}</td>
                      <td className="px-3 py-3 text-gray-500">{item.remark || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Modal isOpen={inventoryOpen} onClose={() => setInventoryOpen(false)} className="w-full max-w-md p-6" showCloseButton={false}>
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Inventory check</h3>
          <p className="text-sm text-gray-600">
            Inventory matching for these materials is not connected yet. Selected items can still be sent to RFQ or an order.
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setInventoryOpen(false)}
              className="h-10 rounded-lg px-4 text-sm font-medium text-white"
              style={{ backgroundColor: PINK }}
            >
              OK
            </button>
          </div>
        </Modal>

        <CreateOrderModal
          open={orderOpen}
          request={row}
          selectedItems={visibleItems.filter((item, index) =>
            selected.includes(item.id || String(index))
          )}
          onClose={() => setOrderOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/operations/procurement/requests"
        className="inline-flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90"
      >
        <span className="text-2xl font-normal text-gray-400">‹</span>
        Request <span className="font-medium text-[#E85D75]">/{isDraft ? "New" : row.code}</span>
      </Link>

      <div className="flex flex-row items-stretch gap-4 rounded-2xl border border-[#F4C4CC] bg-[#FFF6F7] p-4">
        <div className="min-w-0 flex-1 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-full rounded-lg border border-[#F4C4CC] bg-white px-3 text-sm outline-none focus:border-[#E85D75]"
          />
          <div className="grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <span className="text-gray-500">Project Name: </span>
              <span className="font-medium">{row.project?.name || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Request Type: </span>
              <span className="font-medium">{row.type === "SERVICE" ? "Service" : "Material"}</span>
            </div>
            <div>
              <span className="text-gray-500">Created by: </span>
              <span className="font-medium">{createdByLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
              <span className="text-gray-500">Expected delivery date:</span>
              <span className="font-medium">{expectedDelivery ? formatDate(expectedDelivery) : "—"}</span>
              <DatePickerField
                id={`request-expected-delivery-${id}`}
                value={expectedDelivery}
                onChange={setExpectedDelivery}
                variant="icon"
              />
            </div>
            <div>
              <span className="text-gray-500">Items: </span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Created date: </span>
              <span className="font-medium">{formatDate(row.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Attached documents :</span>
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
              className="inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-medium text-white"
            >
              ⊕ Add New doc
            </button>
            {(row.files || []).map((file) => (
              <a
                key={file.id}
                href={designAssetUrl(file.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="truncate rounded-full bg-white px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-200"
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
            onClick={() => void (isDraft ? raise() : saveEdits())}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full text-[10px] font-semibold leading-tight text-white disabled:opacity-50"
            style={{ backgroundColor: PINK }}
          >
            <span className="text-lg leading-none">{isDraft ? "✓" : "✎"}</span>
            {isDraft ? (
              <>
                Raise
                <br />
                Request
              </>
            ) : (
              <>
                Save
                <br />
                Request
              </>
            )}
          </button>
          <button type="button" onClick={() => void cancel()} className="text-sm text-gray-500">
            Cancel
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">Add or delete items from request</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex h-10 items-center rounded-lg border border-[#E85D75] px-4 text-sm font-medium text-[#E85D75]"
          >
            ▾ Add Bulk Items
          </button>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: PINK }}
          >
            + Add Item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 dark:bg-white/5">
            <tr>
              <th className="px-3 py-3 font-medium">S. no.</th>
              <th className="px-3 py-3 font-medium">Item Name</th>
              <th className="px-3 py-3 font-medium">Item Code</th>
              <th className="px-3 py-3 font-medium">UOM</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              <th className="px-3 py-3 font-medium">Remark</th>
              <th className="px-3 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index} className="border-t border-gray-100 dark:border-white/5">
                <td className="px-3 py-2 text-gray-500">{index + 1}</td>
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
                    value={item.uom}
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
                    value={item.qty}
                    onChange={(e) => patchItem(index, { qty: Number(e.target.value) })}
                    className="h-10 w-20 rounded-md bg-[#FFF6F7] px-2 text-sm outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.remark}
                    placeholder="Add a remark"
                    onChange={(e) => patchItem(index, { remark: e.target.value })}
                    className="h-10 w-full bg-transparent text-sm text-gray-400 outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-lg text-[#E85D75]"
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
        className="w-full max-w-lg p-6"
        showCloseButton={false}
      >
        <h3 className="mb-2 text-lg font-semibold text-gray-800">Add Bulk Items</h3>
        <p className="mb-3 text-xs text-gray-500">One item per line: Name, Code, UOM, Qty, Remark</p>
        <textarea
          rows={8}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#E85D75]"
          placeholder="Plywood 18mm, PLY-18, SQFT, 120, Site A"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen(false)}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyBulk}
            className="h-10 rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: PINK }}
          >
            Add Items
          </button>
        </div>
      </Modal>
    </div>
  );
}
