"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePickerField from "@/components/form/DatePickerField";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  inventoryApi,
  modularCatalogsApi,
  projectsApi,
  purchaseOrdersApi,
  vendorsApi,
  type InventoryItemDto,
  type ModularCatalog,
  type ModularCatalogItem,
  type ModularSeries,
  type ModularSizeItem,
  type VendorDto,
  type WarehouseDto,
} from "@/services/crmApi";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

type Destination = "ORDER" | "PURCHASE" | "INVENTORY" | "PROJECT_WH";

type Line = ModularSizeItem & {
  selected: boolean;
  qtyStr: string;
  amountStr: string;
  pickVendorId: string;
  destination: Destination | "";
  createdLabel: string;
};

const DESTINATION_OPTIONS: Array<{ id: Destination; label: string; hint: string }> = [
  { id: "ORDER", label: "Create order", hint: "Work order to this vendor" },
  { id: "PURCHASE", label: "Create purchase", hint: "Purchase order to this vendor" },
  { id: "INVENTORY", label: "Stock in inventory", hint: "Company warehouse stock-in" },
  { id: "PROJECT_WH", label: "Project warehouse", hint: "Stock into this project warehouse" },
];

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function asWarehouseList(data: unknown): WarehouseDto[] {
  if (Array.isArray(data)) return data as WarehouseDto[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: WarehouseDto[] }).items;
  }
  return [];
}

export default function ModularCatalogOrderCreate() {
  const router = useRouter();
  const [series, setSeries] = useState<ModularSeries[]>([]);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; address?: string | null }>>([]);
  const [projectId, setProjectId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuLineId, setMenuLineId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([
      modularCatalogsApi.tree(),
      vendorsApi.list({ limit: 200 }).catch(() => ({ items: [] as VendorDto[] })),
      projectsApi.list({ limit: 100 }).catch(() => ({ items: [] as Record<string, unknown>[] })),
      inventoryApi.warehouses({ archived: "false" }).catch(() => [] as WarehouseDto[]),
    ])
      .then(([tree, vendorData, projectData, warehouseData]) => {
        setSeries(tree.series || []);
        setVendors(vendorData.items || []);
        setProjects(
          (projectData.items || []).map((row) => ({
            id: String(row.id),
            name: String(row.name || "Untitled"),
            address: (row.address as string | null) || null,
          }))
        );
        setWarehouses(asWarehouseList(warehouseData));
      })
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load catalog"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuLineId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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
        destination: "" as const,
        createdLabel: "",
      }))
    );
  }, [sizeId]);

  const selected = lines.filter((row) => row.selected && row.name.trim() && !row.createdLabel);
  const total = selected.reduce(
    (sum, row) => sum + (Number(row.qtyStr) || 0) * (Number(row.amountStr) || 0),
    0
  );

  const updateLine = (id: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const refreshWarehouses = async () => {
    const data = await inventoryApi.warehouses({ archived: "false" });
    const list = asWarehouseList(data);
    setWarehouses(list);
    return list;
  };

  const ensureCompanyWarehouse = async () => {
    const list = warehouses.length ? warehouses : await refreshWarehouses();
    const existing = list.find((w) => w.kind === "COMPANY" && !w.archived);
    if (existing) return existing;
    const created = await inventoryApi.createWarehouse({
      name: "Company warehouse",
      kind: "COMPANY",
    });
    setWarehouses((prev) => [...prev, created]);
    return created;
  };

  const ensureProjectWarehouse = async () => {
    if (!projectId) throw new Error("Select a project for project warehouse stock-in.");
    const list = warehouses.length ? warehouses : await refreshWarehouses();
    const existing = list.find((w) => w.kind === "PROJECT" && w.projectId === projectId && !w.archived);
    if (existing) return existing;
    const created = await inventoryApi.createWarehouse({
      name: `${project?.name || "Project"} warehouse`,
      kind: "PROJECT",
      projectId,
    });
    setWarehouses((prev) => [...prev, created]);
    return created;
  };

  const ensureInventoryItem = async (row: Line): Promise<InventoryItemDto> => {
    const name = row.name.trim();
    const hits = await inventoryApi.searchItems(name).catch(() => [] as InventoryItemDto[]);
    const match = (hits || []).find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
    if (match) return match;
    return inventoryApi.createItem({
      name,
      itemCode: row.code || "",
      primaryUom: row.uom || "Nos",
      category: "Modular",
      goodsType: "FINISHED_GOOD",
      description: `From modular catalog ${catalog?.name || ""}`.trim(),
    });
  };

  const createOrders = async (kind: "PO" | "WO", items: Line[]) => {
    if (!projectId) throw new Error("Select a project.");
    if (!catalog || !size) throw new Error("Select series, catalogue, and size.");
    const date = deliveryDate || todayIso();
    const groups = new Map<string, Line[]>();
    items.forEach((row) => {
      const list = groups.get(row.pickVendorId) || [];
      list.push(row);
      groups.set(row.pickVendorId, list);
    });
    const titleBase = `${catalog.name} · ${size.code || size.name}`;
    const createdIds: string[] = [];
    for (const [vendorId, group] of groups.entries()) {
      const vendor = vendors.find((v) => v.id === vendorId);
      if (!vendor) throw new Error("Vendor not found");
      const created = await purchaseOrdersApi.create({
        kind,
        title: titleBase,
        vendor: vendor.name,
        vendorId: vendor.id,
        projectId,
        expectedDate: date,
        shippingAddress: project?.address || null,
        source: "MODULAR_CATALOG",
        remark: `Modular catalog: ${seriesRow?.name || ""} / ${catalog.name} / ${size.code || size.name}`,
        items: group.map((item) => ({
          name: item.name.trim(),
          code: item.code || null,
          qty: Number(item.qtyStr) || 1,
          unit: item.uom || "NOS",
          rate: Number(item.amountStr) || 0,
        })),
      });
      createdIds.push(created.id);
    }
    return createdIds;
  };

  const createStockIns = async (warehouse: WarehouseDto, items: Line[]) => {
    const groups = new Map<string, Line[]>();
    items.forEach((row) => {
      const list = groups.get(row.pickVendorId) || [];
      list.push(row);
      groups.set(row.pickVendorId, list);
    });
    const createdIds: string[] = [];
    for (const [vendorId, group] of groups.entries()) {
      const vendor = vendors.find((v) => v.id === vendorId);
      const stockIn = await inventoryApi.createStockIn({
        warehouseId: warehouse.id,
        kind: "PURCHASE",
        receiptDate: deliveryDate || todayIso(),
        paymentMode: "Company Account",
        vendorId: vendorId || null,
        notes: `Modular catalog ${catalog?.name || ""} / ${size?.code || size?.name || ""}${
          vendor ? ` · ${vendor.name}` : ""
        }`,
      });
      const mapped = [];
      for (const row of group) {
        const item = await ensureInventoryItem(row);
        mapped.push({
          itemId: item.id,
          itemName: item.name,
          quantity: Number(row.qtyStr) || 1,
          uom: row.uom || item.primaryUom || "Nos",
          unitRate: Number(row.amountStr) || 0,
          gstPercent: 0,
          category: item.category || "Modular",
          hsnSac: item.hsnSac || "",
        });
      }
      await inventoryApi.saveLines(stockIn.id, mapped);
      await inventoryApi.confirmStockIn(stockIn.id);
      createdIds.push(stockIn.id);
    }
    return createdIds;
  };

  const markCreated = (ids: string[], label: string) => {
    setLines((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, createdLabel: label, selected: false } : row))
    );
  };

  const runDestination = async (dest: Destination, items: Line[]) => {
    if (!items.length) throw new Error("Select at least one item.");
    const missingVendor = items.filter((row) => !row.pickVendorId);
    if (missingVendor.length) throw new Error("Pick a vendor for every selected item.");

    if (dest === "ORDER") {
      const ids = await createOrders("WO", items);
      markCreated(
        items.map((r) => r.id),
        ids.length === 1 ? "Order created" : `${ids.length} orders created`
      );
      return {
        message: ids.length > 1 ? `${ids.length} work orders created.` : "Work order created.",
        href: ids.length === 1 ? `/operations/procurement/orders/${ids[0]}` : "",
      };
    }
    if (dest === "PURCHASE") {
      const ids = await createOrders("PO", items);
      markCreated(
        items.map((r) => r.id),
        ids.length === 1 ? "Purchase created" : `${ids.length} purchases created`
      );
      return {
        message: ids.length > 1 ? `${ids.length} purchase orders created.` : "Purchase order created.",
        href: ids.length === 1 ? `/operations/procurement/orders/${ids[0]}` : "",
      };
    }
    if (dest === "INVENTORY") {
      const warehouse = await ensureCompanyWarehouse();
      const ids = await createStockIns(warehouse, items);
      markCreated(
        items.map((r) => r.id),
        "Stocked in inventory"
      );
      return {
        message: `Stocked into ${warehouse.name}.`,
        href: ids.length === 1 ? `/inventory/warehouses/${warehouse.id}` : "/inventory",
      };
    }
    const warehouse = await ensureProjectWarehouse();
    const ids = await createStockIns(warehouse, items);
    markCreated(
      items.map((r) => r.id),
      "Stocked in project warehouse"
    );
    return {
      message: `Stocked into ${warehouse.name}.`,
      href: ids.length === 1 ? `/inventory/warehouses/${warehouse.id}` : "/inventory",
    };
  };

  const pickDestination = async (row: Line, dest: Destination) => {
    if (!row.pickVendorId) {
      toastWarning("Pick a vendor first.");
      return;
    }
    if (dest === "PROJECT_WH" && !projectId) {
      toastWarning("Select a project for project warehouse.");
      return;
    }
    if ((dest === "ORDER" || dest === "PURCHASE") && !projectId) {
      toastWarning("Select a project.");
      return;
    }
    updateLine(row.id, { destination: dest });
    setMenuLineId(null);
    setSaving(true);
    try {
      const result = await runDestination(dest, [{ ...row, destination: dest }]);
      toastSuccess(result.message);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!selected.length) {
      toastWarning("Select at least one item that has not been created yet.");
      return;
    }
    const missingVendor = selected.filter((row) => !row.pickVendorId);
    if (missingVendor.length) {
      toastWarning("Pick a vendor for every selected item.");
      return;
    }
    const missingDest = selected.filter((row) => !row.destination);
    if (missingDest.length) {
      toastWarning("Tap vendor on each item and choose Order, Purchase, Inventory, or Project warehouse.");
      return;
    }

    const byDest = new Map<Destination, Line[]>();
    selected.forEach((row) => {
      const dest = row.destination as Destination;
      const list = byDest.get(dest) || [];
      list.push(row);
      byDest.set(dest, list);
    });

    setSaving(true);
    try {
      const messages: string[] = [];
      let lastHref = "";
      for (const [dest, items] of byDest.entries()) {
        const result = await runDestination(dest, items);
        messages.push(result.message);
        if (result.href) lastHref = result.href;
      }
      toastSuccess(messages.join(" "));
      if (lastHref && byDest.size === 1) {
        router.push(lastHref);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const destLabel = (row: Line) => {
    if (row.createdLabel) return row.createdLabel;
    const found = DESTINATION_OPTIONS.find((o) => o.id === row.destination);
    return found ? found.label : "Order / purchase / stock";
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
            Pick a vendor on each item, then choose order, purchase, inventory stock-in, or project warehouse.
          </p>
        </div>
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void create()}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {saving ? "Creating..." : "Create selected"}
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
              <label className={labelClass}>Delivery date</label>
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
                            disabled={Boolean(row.createdLabel)}
                            onChange={(e) => updateLine(row.id, { selected: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                          {row.name}
                          {row.code ? (
                            <span className="ml-2 text-xs font-normal text-[#8a7b68]">{row.code}</span>
                          ) : null}
                          {row.createdLabel ? (
                            <span className="ml-2 rounded-full bg-[#e8d5b5]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1c1610]">
                              {row.createdLabel}
                            </span>
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
                          <div className="relative min-w-[220px]" ref={menuLineId === row.id ? menuRef : undefined}>
                            <select
                              value={row.pickVendorId}
                              disabled={Boolean(row.createdLabel)}
                              onChange={(e) => {
                                updateLine(row.id, { pickVendorId: e.target.value });
                                if (e.target.value && !row.createdLabel) setMenuLineId(row.id);
                              }}
                              className="h-10 w-full rounded-lg border border-[#eadfcf] bg-white px-2 text-sm"
                            >
                              <option value="">Select vendor</option>
                              {vendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={Boolean(row.createdLabel) || saving}
                              onClick={() => {
                                if (!row.pickVendorId) {
                                  toastWarning("Pick a vendor first.");
                                  return;
                                }
                                setMenuLineId((cur) => (cur === row.id ? null : row.id));
                              }}
                              className="mt-1.5 inline-flex h-8 w-full items-center justify-between rounded-lg border border-[#eadfcf] bg-[#fbf8f3] px-2.5 text-[11px] font-semibold text-[#1c1610] disabled:opacity-50"
                            >
                              <span>{destLabel(row)}</span>
                              <span className="text-[#c4a574]">▾</span>
                            </button>
                            {menuLineId === row.id && !row.createdLabel ? (
                              <div className="absolute right-0 z-30 mt-1 w-[260px] overflow-hidden rounded-xl border border-[#eadfcf] bg-white shadow-[0_10px_30px_rgba(28,22,16,0.12)]">
                                {DESTINATION_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void pickDestination(row, opt.id)}
                                    className="flex w-full flex-col items-start px-3.5 py-2.5 text-left hover:bg-[#fbf8f3]"
                                  >
                                    <span className="text-sm font-medium text-[#1c1610]">{opt.label}</span>
                                    <span className="text-[11px] text-[#8a7b68]">{opt.hint}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
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
