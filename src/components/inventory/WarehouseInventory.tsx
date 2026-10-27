"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  inventoryApi,
  vendorsApi,
  type InventoryTxnDto,
  type StockInKind,
  type VendorDto,
  type WarehouseDto,
  type WarehouseStockDto,
} from "@/services/crmApi";
import { EmptyAnalytics, EmptyTransactions, FilterBtn, SegPills } from "./inventoryChrome";
import { fieldClass, fmtDt, goldBtn, money, moneyPlain, outlineBtn } from "./inventoryUi";

type Tab = "inventory" | "history" | "analytics";

export default function WarehouseInventory() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [warehouse, setWarehouse] = useState<WarehouseDto | null>(null);
  const [tab, setTab] = useState<Tab>("inventory");
  const [stock, setStock] = useState<WarehouseStockDto[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("available");
  const [txns, setTxns] = useState<InventoryTxnDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyType, setHistoryType] = useState<"IN" | "OUT">("IN");
  const [analyticsType, setAnalyticsType] = useState<"IN" | "OUT">("OUT");
  const [period, setPeriod] = useState("this_month");
  const [filterOpen, setFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialQ, setMaterialQ] = useState("");
  const [materialHits, setMaterialHits] = useState<Awaited<ReturnType<typeof inventoryApi.materialSearch>>>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof inventoryApi.analytics>> | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("Company Account");
  const [vendorId, setVendorId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [kind, setKind] = useState<StockInKind>("PURCHASE");
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [metaCats, setMetaCats] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>(["Company Account"]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [w, s] = await Promise.all([
      inventoryApi.warehouse(id),
      inventoryApi.stock(id, {
        search: search || undefined,
        category: category || undefined,
        stock: stockFilter || undefined,
      }),
    ]);
    setWarehouse(w);
    setStock(s);
  }, [id, search, category, stockFilter]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [load]);

  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    inventoryApi
      .transactions({
        warehouseId: id,
        type: historyType,
        limit: 80,
        search: search || undefined,
      })
      .then((r) => setTxns(r.items))
      .catch(() => setTxns([]))
      .finally(() => setHistoryLoading(false));
  }, [tab, id, historyType, search]);

  useEffect(() => {
    if (tab !== "analytics") return;
    inventoryApi
      .analytics(id, { type: analyticsType, period })
      .then(setAnalytics)
      .catch(() => {});
  }, [tab, id, analyticsType, period]);

  const startStockIn = async () => {
    setSaving(true);
    setError("");
    try {
      const created = await inventoryApi.createStockIn({
        warehouseId: id,
        kind,
        receiptDate,
        paymentMode,
        vendorId: vendorId || null,
        receiptNumber,
        defaultCategory,
      });
      if (receiptFile) {
        await inventoryApi.uploadReceipt(created.id, receiptFile);
      }
      setAddOpen(false);
      router.push(`/inventory/warehouses/${id}/stock-in?stockInId=${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start stock-in");
    } finally {
      setSaving(false);
    }
  };

  const cats = Array.from(new Set(stock.map((s) => s.item.category).filter(Boolean)));

  return (
    <div className="vendor-form space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="text-xl text-[#1c1610] dark:text-white">
            ‹
          </Link>
          <h1 className="text-2xl font-semibold text-[#1c1610] dark:text-white">{warehouse?.name || "Warehouse"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === "inventory" && (
            <>
              <input className={`${fieldClass} h-10 !w-48`} placeholder="Search item" value={search} onChange={(e) => setSearch(e.target.value)} />
              <span className={`${outlineBtn} h-10 text-xs`}>Stock Out: {warehouse?.stockOutQty || 0}</span>
            </>
          )}
          {tab !== "inventory" && (
            <button type="button" className={outlineBtn} onClick={() => setMaterialOpen(true)}>
              🔍 Material Search
            </button>
          )}
          {tab === "inventory" && (
          <button
            type="button"
            className={goldBtn}
            onClick={async () => {
              setAddOpen(true);
              const [meta, v] = await Promise.all([
                inventoryApi.itemMeta(),
                vendorsApi.list({ limit: 100 }),
              ]);
              setMetaCats(meta.categories);
              setModes(meta.paymentModes);
              setVendors(v.items);
            }}
          >
            Add Stock
          </button>
          )}
        </div>
      </div>

      <div className="flex gap-6 border-b border-[#eadfcf] text-sm">
        {(
          [
            ["inventory", "Inventory"],
            ["history", "Transaction History"],
            ["analytics", "Analytics"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 pb-2 ${tab === key ? "border-[#C4A574] font-medium text-[#C4A574]" : "border-transparent text-gray-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <select className={`${fieldClass} h-10 !w-48`} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className={`${fieldClass} h-10 !w-44`} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
              <option value="available">Available Stock</option>
              <option value="all">All items</option>
              <option value="zero">Zero stock</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#eadfcf] dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b5c48]">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Available Stock</th>
                  <th className="px-4 py-3">Uom</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Last Purchased Price</th>
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No stock in this warehouse yet.
                    </td>
                  </tr>
                )}
                {stock.map((row) => (
                  <tr key={row.id} className="border-t border-[#eadfcf]">
                    <td className="px-4 py-3">{row.item.name}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.item.primaryUom}</td>
                    <td className="px-4 py-3">{row.item.category}</td>
                    <td className="px-4 py-3">{money(row.lastPurchasedPrice, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SegPills
              value={historyType}
              onChange={setHistoryType}
              options={[
                { id: "IN", label: "Stock In" },
                { id: "OUT", label: "Stock Out" },
              ]}
            />
            <FilterBtn onClick={() => setFilterOpen((v) => !v)} />
          </div>
          {filterOpen && (
            <div className="flex flex-wrap gap-2">
              <input type="date" className={`${fieldClass} h-10 !w-40`} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className={`${fieldClass} h-10 !w-40`} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          )}
          {historyLoading ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
          ) : txns.length === 0 ? (
            <EmptyTransactions />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#eadfcf]">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase text-[#6b5c48]">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txns
                    .filter((t) => {
                      if (fromDate && t.occurredAt < fromDate) return false;
                      if (toDate && t.occurredAt.slice(0, 10) > toDate) return false;
                      return true;
                    })
                    .map((t) => (
                      <tr key={t.id} className="border-t border-[#eadfcf]">
                        <td className="px-4 py-3">{fmtDt(t.occurredAt)}</td>
                        <td className="px-4 py-3">{t.item?.name}</td>
                        <td className="px-4 py-3">{t.quantity}</td>
                        <td className="px-4 py-3">{money(t.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegPills
              value={analyticsType}
              onChange={setAnalyticsType}
              options={[
                { id: "IN", label: "Stock In" },
                { id: "OUT", label: "Stock Out" },
              ]}
            />
            <select className={`${fieldClass} h-10 !w-40`} value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#1c1610]">
            <span>
              Total {analyticsType === "OUT" ? "Stock-Out" : "Stock-In"} Amt:{" "}
              <b>{moneyPlain(analytics.totals?.amount || 0)}</b>
            </span>
            <span className="inline-flex items-center gap-2 text-base">
              <span title="View">👁</span>
              <span title="PDF">📄</span>
              <span title="Add">＋</span>
            </span>
            <span>
              Total {analyticsType === "OUT" ? "Stock-Outs" : "Stock-Ins"}:{" "}
              <b>{analytics.totals?.count || 0}</b>
            </span>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-[#1c1610]">
              1) {analyticsType === "OUT" ? "Stock-Out by State" : "Stock-In by State"}
            </h3>
            {analytics.byState?.length ? (
              <ul className="space-y-1 text-sm">
                {analytics.byState.map((row) => (
                  <li key={row.label} className="flex justify-between border-b border-[#eadfcf] py-2">
                    <span>{row.label}</span>
                    <span>{moneyPlain(row.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyAnalytics label="state" />
            )}
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-[#1c1610]">2) Consumed Stock for Projects</h3>
            {analytics.byProject?.length ? (
              <ul className="space-y-1 text-sm">
                {analytics.byProject.map((row) => (
                  <li key={row.label} className="flex justify-between border-b border-[#eadfcf] py-2">
                    <span>{row.label}</span>
                    <span>{moneyPlain(row.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyAnalytics label="projects" />
            )}
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-[#1c1610]">3) Stock Returned To Vendor</h3>
            {analytics.returnedToVendor?.length ? (
              <ul className="space-y-1 text-sm">
                {analytics.returnedToVendor.map((row) => (
                  <li key={row.label} className="flex justify-between border-b border-[#eadfcf] py-2">
                    <span>{row.label}</span>
                    <span>{moneyPlain(row.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyAnalytics label="returns" />
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error-500">{error}</p>}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} className="w-full max-w-2xl p-0" showCloseButton={false}>
        <div className="flex items-center justify-between border-b border-[#eadfcf] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#1c1610]">Add Stock Details</h2>
          <button type="button" onClick={() => setAddOpen(false)} className="text-xl text-gray-400">
            ×
          </button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Date Of Receipt *</label>
            <input type="date" className={fieldClass} value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Payment Mode *</label>
            <select className={fieldClass} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {modes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Vendor</label>
            <select className={fieldClass} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select Vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Receipt Number</label>
            <input className={fieldClass} placeholder="e.g. INV-00123" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Default Category</label>
            <input
              className={fieldClass}
              list="stock-cats"
              placeholder="Select Category"
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
            />
            <datalist id="stock-cats">
              {metaCats.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Stock type</label>
            <select className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value as StockInKind)}>
              <option value="PURCHASE">Purchase</option>
              <option value="DELIVERY">Deliveries StockIn</option>
              <option value="EXPENSE">Expense StockIn</option>
            </select>
          </div>
          <label className="col-span-full flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#C4A574]/60 bg-[#fcfaf6] px-4 py-8 text-center">
            <span className="text-[#C4A574]">📎</span>
            <span className="mt-1 font-medium text-[#1c1610]">Attach a Receipt</span>
            <span className="text-xs text-gray-400">Image, PDF or Excel — Max 5MB</span>
            {receiptFile && <span className="mt-2 text-xs text-[#C4A574]">{receiptFile.name}</span>}
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.xls,.xlsx"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <div className="flex justify-end border-t border-[#eadfcf] px-5 py-4">
          <button type="button" className={goldBtn} disabled={saving} onClick={startStockIn}>
            {saving ? "Starting..." : "Next"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={materialOpen} onClose={() => setMaterialOpen(false)} className="w-full max-w-lg p-6">
        <h2 className="mb-3 text-lg font-semibold text-[#1c1610]">Material Search</h2>
        <input
          className={fieldClass}
          placeholder="Search catalog stock..."
          value={materialQ}
          onChange={async (e) => {
            const q = e.target.value;
            setMaterialQ(q);
            if (!q.trim()) {
              setMaterialHits([]);
              return;
            }
            try {
              setMaterialHits(await inventoryApi.materialSearch(q.trim()));
            } catch {
              setMaterialHits([]);
            }
          }}
        />
        <div className="mt-3 max-h-80 overflow-auto">
          {materialHits.map((hit) => (
            <div key={hit.id} className="rounded-xl px-3 py-2 hover:bg-[#faf6ef]">
              <div className="font-medium">{hit.item.name}</div>
              <div className="text-xs text-gray-500">
                {hit.warehouse.name} · Qty {hit.quantity} · {money(hit.lastPurchasedPrice, 0)}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
