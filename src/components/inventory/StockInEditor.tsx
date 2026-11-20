"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  inventoryApi,
  type InventoryItemDto,
  type StockInDto,
  type StockInLineDto,
  type WarehouseDto,
} from "@/services/crmApi";
import InventoryItemFormModal from "./InventoryItemFormModal";
import { fieldClass, fmtDate, goldBtn, money, outlineBtn } from "./inventoryUi";

type Line = {
  key: string;
  id?: string;
  itemId?: string | null;
  itemName: string;
  hsnSac: string;
  category: string;
  quantity: number | string;
  uom: string;
  unitRate: number | string;
  gstPercent: number | string;
  cataloged: boolean;
};

const toLine = (row: StockInLineDto, i: number): Line => ({
  key: row.id || `n-${i}`,
  id: row.id,
  itemId: row.itemId,
  itemName: row.item?.name || row.itemName || "",
  hsnSac: row.hsnSac || row.item?.hsnSac || "",
  category: row.category || row.item?.category || "",
  quantity: row.quantity,
  uom: row.uom || row.item?.primaryUom || "Nos",
  unitRate: row.unitRate,
  gstPercent: row.gstPercent,
  cataloged: Boolean(row.itemId),
});

function calc(line: Line) {
  const qty = Number(line.quantity) || 0;
  const rate = Number(line.unitRate) || 0;
  const gst = Number(line.gstPercent) || 0;
  const price = qty * rate;
  return { qty, price, total: price * (1 + gst / 100) };
}

export default function StockInEditor() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const warehouseId = params.id;
  const stockInId = search.get("stockInId") || "";

  const [warehouse, setWarehouse] = useState<WarehouseDto | null>(null);
  const [doc, setDoc] = useState<StockInDto | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState<string | null>(null);
  const [matches, setMatches] = useState<InventoryItemDto[]>([]);
  const [catalogFor, setCatalogFor] = useState<Line | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateDropdownPos = useCallback((key: string | null) => {
    if (!key) {
      setDropdownPos(null);
      return;
    }
    const el = itemInputRefs.current[key];
    if (!el) {
      setDropdownPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      setDropdownPos(null);
      return;
    }
    updateDropdownPos(searchOpen);
    const onReposition = () => updateDropdownPos(searchOpen);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [searchOpen, matches.length, updateDropdownPos]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const input = itemInputRefs.current[searchOpen];
      const menu = document.getElementById("stock-in-item-dropdown");
      if (input?.contains(target) || menu?.contains(target)) return;
      setSearchOpen(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  const load = useCallback(async () => {
    if (!stockInId) return;
    const [w, d] = await Promise.all([
      inventoryApi.warehouse(warehouseId),
      inventoryApi.getStockIn(stockInId),
    ]);
    setWarehouse(w);
    setDoc(d);
    const next = (d.lines || []).map(toLine);
    setLines(next.length ? next : [toLine({} as StockInLineDto, 0)]);
  }, [stockInId, warehouseId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [load]);

  const persist = useCallback(
    async (nextLines: Line[]) => {
      if (!stockInId || doc?.status === "CONFIRMED") return;
      setSaving(true);
      try {
        const saved = await inventoryApi.saveLines(
          stockInId,
          nextLines.map((l) => ({
            itemId: l.itemId || null,
            itemName: l.itemName,
            hsnSac: l.hsnSac,
            category: l.category,
            quantity: Number(l.quantity) || 0,
            uom: l.uom,
            unitRate: Number(l.unitRate) || 0,
            gstPercent: Number(l.gstPercent) || 0,
          }))
        );
        setDoc(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save lines");
      } finally {
        setSaving(false);
      }
    },
    [stockInId, doc?.status]
  );

  const scheduleSave = (next: Line[]) => {
    setLines(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 500);
  };

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const c = calc(l);
        acc.qty += c.qty;
        acc.total += c.total;
        return acc;
      },
      { qty: 0, total: 0 }
    );
  }, [lines]);

  const searchCatalog = async (key: string, q: string) => {
    setSearchOpen(key);
    requestAnimationFrame(() => updateDropdownPos(key));
    if (!q.trim()) {
      setMatches([]);
      return;
    }
    try {
      setMatches(await inventoryApi.searchItems(q.trim()));
    } catch {
      setMatches([]);
    }
  };

  const pickItem = (key: string, item: InventoryItemDto) => {
    const next = lines.map((l) =>
      l.key === key
        ? {
            ...l,
            itemId: item.id,
            itemName: item.name,
            hsnSac: item.hsnSac,
            category: item.category || doc?.defaultCategory || "",
            uom: item.primaryUom || l.uom,
            gstPercent: item.taxPercent ?? l.gstPercent,
            cataloged: true,
          }
        : l
    );
    setSearchOpen(null);
    scheduleSave(next);
  };

  const linkCatalogItem = (line: Line, item: InventoryItemDto): Line => ({
    ...line,
    itemId: item.id,
    itemName: item.name,
    hsnSac: item.hsnSac || line.hsnSac,
    category: item.category || line.category,
    uom: item.primaryUom || line.uom,
    gstPercent: item.taxPercent ?? line.gstPercent,
    cataloged: true,
  });

  const ensureLineInCatalog = async (line: Line): Promise<Line> => {
    if (line.itemId) return line;
    const name = line.itemName.trim();
    if (!name) {
      throw new Error("Enter an item name before confirming stock-in");
    }
    const category = (line.category || doc?.defaultCategory || "").trim();
    if (!category) {
      throw new Error(`Add a category for “${name}” before confirming`);
    }

    try {
      const found = await inventoryApi.searchItems(name);
      const exact = found.find(
        (row) => row.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (exact) return linkCatalogItem(line, exact);
    } catch {
      /* create below */
    }

    const created = await inventoryApi.createItem({
      name,
      category,
      primaryUom: String(line.uom || "Nos").trim() || "Nos",
      hsnSac: line.hsnSac || "",
      taxPercent: Number(line.gstPercent) || 0,
      goodsType: "RAW_MATERIAL",
    });
    return linkCatalogItem(line, created);
  };

  const confirm = async () => {
    if (!stockInId) return;
    const active = lines.filter((l) => l.itemName.trim() || Number(l.quantity) > 0);
    if (!active.length) {
      setError("Add at least one item before confirming stock-in");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const linked: Line[] = [];
      for (const line of lines) {
        if (!line.itemName.trim() && !(Number(line.quantity) > 0)) {
          linked.push(line);
          continue;
        }
        linked.push(await ensureLineInCatalog(line));
      }
      setLines(linked);
      await persist(linked);
      await inventoryApi.confirmStockIn(stockInId);
      router.push(`/inventory/warehouses/${warehouseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setSaving(false);
    }
  };

  if (!stockInId) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Missing stock-in. <Link className="text-[#C4A574]" href={`/inventory/warehouses/${warehouseId}`}>Back</Link>
      </div>
    );
  }

  return (
    <div className="vendor-form space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/inventory/warehouses/${warehouseId}`} className="text-xl text-[#1c1610]">
            ‹
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[#1c1610] dark:text-white">
              Add Stock <span className="text-sm font-normal text-gray-500">({warehouse?.name})</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          <button
            type="button"
            className={goldBtn}
            disabled={saving || doc?.status === "CONFIRMED"}
            onClick={confirm}
          >
            Confirm StockIn
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <div>
              Receipt Number : <span className="font-medium">{doc?.receiptNumber || "—"}</span>
            </div>
            <div>
              Vendor : <span className="font-medium">{doc?.vendor?.name || "—"}</span>
            </div>
            <div>
              Default Category : <span className="font-medium">{doc?.defaultCategory || "—"}</span>
            </div>
          </div>
          <div className="md:text-right">
            <div>
              Date of Receipt : <span className="font-medium">{fmtDate(doc?.receiptDate)}</span>
            </div>
            <div>
              Payment Mode : <span className="font-medium">{doc?.paymentMode}</span>
            </div>
          </div>
        </div>
        {doc?.receiptFileUrl && (
          <a href={doc.receiptFileUrl} target="_blank" rel="noreferrer" className={`${outlineBtn} mt-3 h-9 text-xs`}>
            View receipt
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-[#1c1610]">Additional Charges</div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            QTY : <b>{totals.qty}</b>
          </span>
          <span>
            ITEMS TOTAL : <b>{money(totals.total)}</b>
          </span>
          <button
            type="button"
            className={goldBtn}
            onClick={() =>
              scheduleSave([
                ...lines,
                {
                  key: `n-${Date.now()}`,
                  itemName: "",
                  hsnSac: "",
                  category: doc?.defaultCategory || "",
                  quantity: 0,
                  uom: "Nos",
                  unitRate: 0,
                  gstPercent: 0,
                  cataloged: false,
                },
              ])
            }
          >
            + Add item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#eadfcf] dark:border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b5c48]">
            <tr>
              {["S.No", "Item Name", "HSN/SAC", "Category", "Quantity", "UOM", "Unit Rate", "Price", "GST %", "Total", "Action"].map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const c = calc(line);
              const missing = Boolean(line.itemName) && !line.itemId;
              return (
                <tr key={line.key} className={missing ? "bg-[#fdf6f0]" : "bg-white dark:bg-transparent"}>
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="min-w-[220px] px-3 py-2">
                    <input
                      ref={(el) => {
                        itemInputRefs.current[line.key] = el;
                      }}
                      className={`${fieldClass} h-9 ${missing ? "border-[#C4A574]" : ""}`}
                      placeholder="Search item"
                      value={line.itemName}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next = lines.map((l) =>
                          l.key === line.key ? { ...l, itemName: v, itemId: null, cataloged: false } : l
                        );
                        scheduleSave(next);
                        searchCatalog(line.key, v);
                      }}
                      onFocus={() => line.itemName && searchCatalog(line.key, line.itemName)}
                    />
                    {missing ? (
                      <p className="mt-1 text-[11px] text-[#9a7748]">
                        New item — will be added to catalog on confirm
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${fieldClass} h-9 w-24`}
                      value={line.hsnSac}
                      onChange={(e) =>
                        scheduleSave(lines.map((l) => (l.key === line.key ? { ...l, hsnSac: e.target.value } : l)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${fieldClass} h-9 w-36`}
                      value={line.category}
                      onChange={(e) =>
                        scheduleSave(lines.map((l) => (l.key === line.key ? { ...l, category: e.target.value } : l)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className={`${fieldClass} h-9 w-20`}
                      value={line.quantity}
                      onChange={(e) =>
                        scheduleSave(lines.map((l) => (l.key === line.key ? { ...l, quantity: e.target.value } : l)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${fieldClass} h-9 w-20`}
                      value={line.uom}
                      onChange={(e) =>
                        scheduleSave(lines.map((l) => (l.key === line.key ? { ...l, uom: e.target.value } : l)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className={`${fieldClass} h-9 w-24`}
                      value={line.unitRate}
                      onChange={(e) =>
                        scheduleSave(lines.map((l) => (l.key === line.key ? { ...l, unitRate: e.target.value } : l)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">{money(c.price)}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className={`${fieldClass} h-9 w-16`}
                      value={line.gstPercent}
                      onChange={(e) =>
                        scheduleSave(lines.map((l) => (l.key === line.key ? { ...l, gstPercent: e.target.value } : l)))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{money(c.total)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {!line.itemId && (
                        <button
                          type="button"
                          title="Add To Catalog"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#C4A574] text-sm text-[#1c1610]"
                          onClick={() => setCatalogFor(line)}
                        >
                          +
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => scheduleSave(lines.filter((l) => l.key !== line.key))}
                      >
                        ⌫
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p className="text-sm text-error-500">{error}</p>}

      {searchOpen &&
      dropdownPos &&
      (lines.find((l) => l.key === searchOpen)?.itemName || "").trim() &&
      typeof document !== "undefined" &&
      createPortal(
        <div
          id="stock-in-item-dropdown"
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 100060,
          }}
          className="rounded-xl border border-[#eadfcf] bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          {matches.length > 0 ? (
            <div className="max-h-56 overflow-auto py-1">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#faf6ef] dark:hover:bg-white/5"
                  onClick={() => pickItem(searchOpen, m)}
                >
                  <div className="font-medium text-[#1c1610] dark:text-white">{m.name}</div>
                  <div className="text-xs text-gray-500">
                    {m.itemCode || "No code"} · {m.category || "Uncategorised"}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-xs text-gray-500">
              <p className="mb-2">Not in catalog yet.</p>
              <button
                type="button"
                className="rounded-lg bg-[#C4A574] px-2.5 py-1.5 text-[11px] font-semibold text-[#1c1610]"
                onClick={() => {
                  const line = lines.find((l) => l.key === searchOpen) || null;
                  setSearchOpen(null);
                  if (line) setCatalogFor(line);
                }}
              >
                Add to catalog
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      <InventoryItemFormModal
        open={Boolean(catalogFor)}
        onClose={() => setCatalogFor(null)}
        initialName={catalogFor?.itemName || ""}
        defaultCategory={catalogFor?.category || doc?.defaultCategory || ""}
        onSaved={(item) => {
          if (!catalogFor) return;
          pickItem(catalogFor.key, item);
          setCatalogFor(null);
        }}
      />
    </div>
  );
}
