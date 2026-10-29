"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import VendorFulfillButton from "@/components/procurement/VendorFulfillButton";
import VendorPickButton from "@/components/procurement/VendorPickButton";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import {
  modularCatalogsApi,
  projectsApi,
  vendorsApi,
  type ModularOrderCollection,
  type ModularOrderCollectionItem,
  type VendorDto,
} from "@/services/crmApi";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";
const cellInput =
  "h-10 w-full min-w-[4.5rem] rounded-lg border border-[#eadfcf] bg-white px-2 text-sm outline-none focus:border-[#c4a574]";

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

/** Keep current row order when API returns items in a different sequence. */
function mergeCollectionOrder(
  prev: ModularOrderCollection | null,
  next: ModularOrderCollection
): ModularOrderCollection {
  if (!prev?.items?.length) return next;
  const byId = new Map(next.items.map((item) => [item.id, item]));
  const kept = prev.items.map((item) => byId.get(item.id)).filter(Boolean) as ModularOrderCollectionItem[];
  const keptIds = new Set(kept.map((item) => item.id));
  const added = next.items.filter((item) => !keptIds.has(item.id));
  return { ...next, items: [...kept, ...added] };
}

export default function ModularCatalogCollectionDetail({ id }: { id: string }) {
  const [collection, setCollection] = useState<ModularOrderCollection | null>(null);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; address?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const [row, vendorData, projectData] = await Promise.all([
      modularCatalogsApi.getCollection(id),
      vendorsApi.list({ limit: 200 }).catch(() => ({ items: [] as VendorDto[] })),
      projectsApi.list({ limit: 100 }).catch(() => ({ items: [] as Record<string, unknown>[] })),
    ]);
    setCollection(row);
    setVendors(vendorData.items || []);
    setProjects(
      (projectData.items || []).map((item) => ({
        id: String(item.id),
        name: String(item.name || "Untitled"),
        address: (item.address as string | null) || null,
      }))
    );
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load collection"))
      .finally(() => setLoading(false));
  }, [id]);

  const project = projects.find((row) => row.id === collection?.projectId) || collection?.project || null;

  const saveProject = async (projectId: string) => {
    if (!collection) return;
    try {
      const updated = await modularCatalogsApi.updateCollection(collection.id, { projectId: projectId || null });
      setCollection((prev) => mergeCollectionOrder(prev, updated));
      toastSuccess("Project saved.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not save project");
    }
  };

  const saveVendor = async (item: ModularOrderCollectionItem, vendorId: string | null) => {
    if (!collection) return;
    try {
      const updated = await modularCatalogsApi.updateCollection(collection.id, {
        items: [{ id: item.id, vendorId }],
      });
      setCollection((prev) => mergeCollectionOrder(prev, updated));
      toastSuccess("Vendor saved.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not save vendor");
    }
  };

  const patchItem = async (item: ModularOrderCollectionItem, patch: Record<string, unknown>) => {
    if (!collection || item.fulfillKind) return;
    try {
      const updated = await modularCatalogsApi.updateCollection(collection.id, {
        items: [{ id: item.id, ...patch }],
      });
      setCollection((prev) => mergeCollectionOrder(prev, updated));
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not update item");
    }
  };

  const addItems = async (count = 1) => {
    if (!collection || adding) return;
    setAdding(true);
    try {
      const payload = Array.from({ length: Math.max(1, count) }, () => ({
        name: "New item",
        qty: 1,
        uom: "NOS",
        amount: 0,
      }));
      const updated = await modularCatalogsApi.updateCollection(collection.id, {
        addItems: payload,
      });
      if (!updated?.items || updated.items.length <= collection.items.length) {
        const refreshed = await modularCatalogsApi.getCollection(collection.id);
        setCollection((prev) => mergeCollectionOrder(prev, refreshed));
      } else {
        setCollection((prev) => mergeCollectionOrder(prev, updated));
      }
      toastSuccess(count > 1 ? `${count} items added.` : "Item added.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setAdding(false);
    }
  };

  const removeItem = async (item: ModularOrderCollectionItem) => {
    if (!collection || item.fulfillKind) return;
    try {
      const updated = await modularCatalogsApi.updateCollection(collection.id, {
        removeItemIds: [item.id],
      });
      setCollection((prev) => mergeCollectionOrder(prev, updated));
      toastSuccess("Item removed.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not remove item");
    }
  };

  if (loading || !collection) {
    return (
      <div className="rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] px-4 py-10 text-center text-sm text-[#8a7b68]">
        {loading ? "Loading collection…" : "Collection not found."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/operations/procurement/modular-catalog"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574] hover:underline"
        >
          ← Order collections
        </Link>
        <h1
          className="mt-2 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {collection.code}
        </h1>
        <p className="mt-1 text-sm text-[#8a7b68]">{collection.title}</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass}>
            Project <span className="text-[#c4a574]">*</span>
          </label>
          <select
            value={collection.projectId || ""}
            onChange={(e) => void saveProject(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select project</option>
            {projects.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Catalogue</p>
          <p className="mt-1 text-sm text-[#1c1610]">
            {collection.catalogName}
            {collection.sizeName ? ` · ${collection.sizeName}` : ""}
          </p>
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Total</p>
          <p className="mt-1 font-serif text-2xl text-[#1c1610]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {money(collection.amount)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fdfbf7]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eadfcf] px-4 py-3">
          <p className="text-sm font-medium text-[#1c1610]">Items ({collection.items.length})</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={adding}
              onClick={() => void addItems(1)}
              className="inline-flex h-9 items-center rounded-xl bg-[#1c1610] px-3 text-sm font-medium text-[#e8d5b5] disabled:opacity-50"
            >
              + Add Item
            </button>
            <button
              type="button"
              disabled={adding}
              onClick={() => void addItems(3)}
              className="inline-flex h-9 items-center rounded-xl border border-[#eadfcf] px-3 text-sm text-[#c4a574] disabled:opacity-50"
            >
              Add Bulk Items ▾
            </button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="border-b border-[#eadfcf] bg-[#fbf8f3] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              <tr>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Qty</th>
                <th className="px-3 py-3">UOM</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3">Create order</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {collection.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#8a7b68]">
                    No items yet. Use + Add Item to add one.
                  </td>
                </tr>
              ) : (
                collection.items.map((row) => {
                  const vendor = vendors.find((v) => v.id === row.vendorId);
                  const done = Boolean(row.fulfillKind);
                  return (
                    <tr key={row.id} className="border-b border-[#eadfcf]/70 last:border-0">
                      <td className="px-3 py-2.5">
                        {done ? (
                          <span className="font-medium text-[#1c1610]">
                            {row.name}
                            {row.code ? (
                              <span className="ml-2 text-xs font-normal text-[#8a7b68]">{row.code}</span>
                            ) : null}
                            <span className="ml-2 rounded-full bg-[#e8d5b5]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              {row.fulfillKind === "PURCHASE" ? "Purchased" : "Ordered"}
                            </span>
                          </span>
                        ) : (
                          <input
                            value={row.name}
                            onChange={(e) =>
                              setCollection((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      items: prev.items.map((item) =>
                                        item.id === row.id ? { ...item, name: e.target.value } : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                            onBlur={(e) => void patchItem(row, { name: e.target.value })}
                            className={`${cellInput} min-w-[12rem] font-medium`}
                            placeholder="Item name"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {done ? (
                          <span className="text-[#8a7b68]">{row.qty}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={row.qty}
                            onChange={(e) =>
                              setCollection((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      items: prev.items.map((item) =>
                                        item.id === row.id
                                          ? { ...item, qty: Number(e.target.value) || 0 }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                            onBlur={(e) => void patchItem(row, { qty: Number(e.target.value) || 1 })}
                            className={`${cellInput} w-20`}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {done ? (
                          <span className="text-[#8a7b68]">{row.uom}</span>
                        ) : (
                          <input
                            value={row.uom}
                            onChange={(e) =>
                              setCollection((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      items: prev.items.map((item) =>
                                        item.id === row.id ? { ...item, uom: e.target.value } : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                            onBlur={(e) => void patchItem(row, { uom: e.target.value })}
                            className={`${cellInput} w-20`}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {done ? (
                          money(row.amount)
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={row.amount}
                            onChange={(e) =>
                              setCollection((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      items: prev.items.map((item) =>
                                        item.id === row.id
                                          ? { ...item, amount: Number(e.target.value) || 0 }
                                          : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                            onBlur={(e) => void patchItem(row, { amount: Number(e.target.value) || 0 })}
                            className={`${cellInput} w-28`}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <VendorPickButton
                          vendors={vendors}
                          value={row.vendorId}
                          disabled={done}
                          onSelect={(vendorRow) => void saveVendor(row, vendorRow?.id || null)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {done ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">
                            {row.fulfillKind === "PURCHASE" ? "Purchased" : "Ordered"}
                          </span>
                        ) : (
                          <VendorFulfillButton
                            compact
                            label="Create order"
                            disabled={!row.vendorId || !collection.projectId || !row.name.trim()}
                            ctx={{
                              vendorId: row.vendorId,
                              vendorName: vendor?.name || row.vendorName || "",
                              projectId: collection.projectId,
                              projectName: project?.name,
                              projectAddress: project?.address,
                              title: `${row.name}${collection.sizeName ? ` · ${collection.sizeName}` : ""}`,
                              expectedDate: collection.deliveryDate,
                              source: "MODULAR_CATALOG",
                              remark: `Modular collection ${collection.code} · ${row.name}`,
                            }}
                            items={[
                              {
                                name: row.name,
                                code: row.code,
                                qty: row.qty,
                                unit: row.uom,
                                rate: row.amount,
                              },
                            ]}
                            onDone={(dest, result) => {
                              void modularCatalogsApi
                                .fulfillCollectionItem(collection.id, row.id, {
                                  fulfillKind: dest,
                                  purchaseOrderId: result.purchaseOrderId || null,
                                  vendorId: row.vendorId,
                                })
                                .then((updated) => setCollection((prev) => mergeCollectionOrder(prev, updated)))
                                .catch((err) =>
                                  toastError(err instanceof Error ? err.message : "Could not mark item")
                                );
                            }}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {done ? (
                          <span className="text-[#cfc4b4]">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void removeItem(row)}
                            className="text-[#8a7b68] hover:text-[#1c1610]"
                            aria-label="Remove item"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          disabled={adding}
          onClick={() => void addItems(1)}
          className="px-4 py-3 text-sm text-[#2563EB] disabled:opacity-50"
        >
          + Add Item
        </button>
      </div>
    </div>
  );
}
