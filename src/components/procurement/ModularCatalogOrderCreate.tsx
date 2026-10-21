"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  modularCatalogsApi,
  projectsApi,
  purchaseOrdersApi,
  vendorsApi,
  type ModularCatalog,
  type ModularCatalogItem,
  type ModularSeries,
  type ModularSizeItem,
  type VendorDto,
} from "@/services/crmApi";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

type Line = ModularSizeItem & {
  selected: boolean;
  qtyStr: string;
  amountStr: string;
  pickVendorId: string;
};

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function ModularCatalogOrderCreate() {
  const router = useRouter();
  const [series, setSeries] = useState<ModularSeries[]>([]);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; address?: string | null }>>([]);
  const [projectId, setProjectId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      modularCatalogsApi.tree(),
      vendorsApi.list({ limit: 200 }).catch(() => ({ items: [] as VendorDto[] })),
      projectsApi.list({ limit: 100 }).catch(() => ({ items: [] as Record<string, unknown>[] })),
    ])
      .then(([tree, vendorData, projectData]) => {
        setSeries(tree.series || []);
        setVendors(vendorData.items || []);
        setProjects(
          (projectData.items || []).map((row) => ({
            id: String(row.id),
            name: String(row.name || "Untitled"),
            address: (row.address as string | null) || null,
          }))
        );
      })
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load catalog"))
      .finally(() => setLoading(false));
  }, []);

  const catalogs = useMemo(() => {
    const row = series.find((s) => s.id === seriesId);
    return (row?.catalogs || []) as ModularCatalog[];
  }, [series, seriesId]);

  const sizes = useMemo(() => {
    const row = catalogs.find((c) => c.id === catalogId);
    return (row?.items || []) as ModularCatalogItem[];
  }, [catalogs, catalogId]);

  const size = sizes.find((s) => s.id === sizeId) || null;
  const catalog = catalogs.find((c) => c.id === catalogId) || null;
  const seriesRow = series.find((s) => s.id === seriesId) || null;
  const project = projects.find((p) => p.id === projectId) || null;

  useEffect(() => {
    if (!size) {
      setLines([]);
      return;
    }
    setLines(
      (size.parts || []).map((part) => ({
        ...part,
        selected: true,
        qtyStr: String(part.qty || 1),
        amountStr: part.amount ? String(part.amount) : "",
        pickVendorId: part.vendorId || "",
      }))
    );
  }, [sizeId]);

  const selected = lines.filter((row) => row.selected && row.name.trim());
  const total = selected.reduce(
    (sum, row) => sum + (Number(row.qtyStr) || 0) * (Number(row.amountStr) || 0),
    0
  );

  const updateLine = (id: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const create = async () => {
    if (!projectId) {
      toastWarning("Select a project.");
      return;
    }
    if (!size || !catalog) {
      toastWarning("Select series, catalogue, and size.");
      return;
    }
    if (!deliveryDate) {
      toastWarning("Delivery date is required.");
      return;
    }
    if (!selected.length) {
      toastWarning("Select at least one item.");
      return;
    }
    const missingVendor = selected.filter((row) => !row.pickVendorId);
    if (missingVendor.length) {
      toastWarning("Pick a vendor for every selected item.");
      return;
    }

    const groups = new Map<string, Line[]>();
    selected.forEach((row) => {
      const list = groups.get(row.pickVendorId) || [];
      list.push(row);
      groups.set(row.pickVendorId, list);
    });

    const titleBase = `${catalog.name} · ${size.code || size.name}`;
    setSaving(true);
    try {
      const createdIds: string[] = [];
      for (const [vendorId, items] of groups.entries()) {
        const vendor = vendors.find((v) => v.id === vendorId);
        if (!vendor) throw new Error("Vendor not found");
        const created = await purchaseOrdersApi.create({
          kind: "PO",
          title: titleBase,
          vendor: vendor.name,
          vendorId: vendor.id,
          projectId,
          expectedDate: deliveryDate,
          shippingAddress: project?.address || null,
          source: "MODULAR_CATALOG",
          remark: `Modular catalog: ${seriesRow?.name || ""} / ${catalog.name} / ${size.code || size.name}`,
          items: items.map((item) => ({
            name: item.name.trim(),
            code: item.code || null,
            qty: Number(item.qtyStr) || 1,
            unit: item.uom || "NOS",
            rate: Number(item.amountStr) || 0,
          })),
        });
        createdIds.push(created.id);
      }
      toastSuccess(
        createdIds.length > 1
          ? `${createdIds.length} purchase orders created (one per vendor).`
          : "Purchase order created."
      );
      if (createdIds.length === 1) {
        router.push(`/operations/procurement/orders/${createdIds[0]}`);
      } else {
        router.push("/operations/procurement/modular-catalog");
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/operations/procurement/modular-catalog"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574] hover:underline"
          >
            ← Modular Catalog Order
          </Link>
          <h1
            className="mt-2 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Create order
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Choose a size; items, amounts, and vendors come from the catalog.
          </p>
        </div>
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void create()}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {saving ? "Creating..." : "Generate order"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] px-4 py-10 text-center text-sm text-[#8a7b68]">
          Loading catalog…
        </div>
      ) : (
        <>
          <div className="grid gap-4 rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>
                Project <span className="text-[#c4a574]">*</span>
              </label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldClass}>
                <option value="">Select project</option>
                {projects.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Series <span className="text-[#c4a574]">*</span>
              </label>
              <select
                value={seriesId}
                onChange={(e) => {
                  setSeriesId(e.target.value);
                  setCatalogId("");
                  setSizeId("");
                }}
                className={fieldClass}
              >
                <option value="">Select series</option>
                {series.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Catalogue <span className="text-[#c4a574]">*</span>
              </label>
              <select
                value={catalogId}
                onChange={(e) => {
                  setCatalogId(e.target.value);
                  setSizeId("");
                }}
                className={fieldClass}
                disabled={!seriesId}
              >
                <option value="">Select catalogue</option>
                {catalogs.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Size <span className="text-[#c4a574]">*</span>
              </label>
              <select
                value={sizeId}
                onChange={(e) => setSizeId(e.target.value)}
                className={fieldClass}
                disabled={!catalogId}
              >
                <option value="">Select size</option>
                {sizes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code || row.name}
                    {row.areaSqFt ? ` — ${row.areaSqFt} sq.ft` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Delivery date <span className="text-[#c4a574]">*</span>
              </label>
              <DatePickerField
                id="modular-order-delivery"
                value={deliveryDate}
                onChange={setDeliveryDate}
                placeholder="Select date"
              />
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                Selected total
              </p>
              <p
                className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {money(total)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#eadfcf] bg-[#fbf8f3] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
                  <tr>
                    <th className="px-3 py-3 w-10" />
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3">UOM</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {!sizeId ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                        Select a size to load catalog items.
                      </td>
                    </tr>
                  ) : lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                        This size has no items yet. Add them in Modular Catalog settings.
                      </td>
                    </tr>
                  ) : (
                    lines.map((row) => (
                      <tr key={row.id} className="border-b border-[#eadfcf]/70 last:border-0 dark:border-[#3a342c]">
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => updateLine(row.id, { selected: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                          {row.name}
                          {row.code ? (
                            <span className="ml-2 text-xs font-normal text-[#8a7b68]">{row.code}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={row.qtyStr}
                            onChange={(e) => updateLine(row.id, { qtyStr: e.target.value })}
                            className="h-10 w-20 rounded-lg border border-[#eadfcf] bg-white px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-[#8a7b68]">{row.uom}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={row.amountStr}
                            onChange={(e) => updateLine(row.id, { amountStr: e.target.value })}
                            className="h-10 w-28 rounded-lg border border-[#eadfcf] bg-white px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={row.pickVendorId}
                            onChange={(e) => updateLine(row.id, { pickVendorId: e.target.value })}
                            className="h-10 min-w-[180px] rounded-lg border border-[#eadfcf] bg-white px-2 text-sm"
                          >
                            <option value="">Select vendor</option>
                            {vendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
