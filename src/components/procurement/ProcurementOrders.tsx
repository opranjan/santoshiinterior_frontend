"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import AcceptancePreviewDrawer from "@/components/procurement/AcceptancePreviewDrawer";
import CreateOrderModal from "@/components/procurement/CreateOrderModal";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

const ORDER_STATES: Array<{ value: string; label: string; className: string }> = [
  { value: "ORDER_CREATED", label: "Order Created", className: "border-[#eadfcf] bg-[#f6efe4] text-[#9a7748]" },
  { value: "NOT_APPROVED", label: "Not Approved", className: "border-[#eadfcf] bg-[#f4f1eb] text-[#8a7b68]" },
  { value: "INTERNALLY_APPROVED", label: "Internally Approved", className: "border-[#eadfcf] bg-[#efe8dc] text-[#5c472c]" },
  { value: "ORDER_ACCEPTED", label: "Order Accepted", className: "border-[#1c1610] bg-[#1c1610] text-[#e8d5b5]" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered", className: "border-[#eadfcf] bg-[#fbf8f3] text-[#9a7748]" },
  { value: "FULLY_DELIVERED", label: "Fully Delivered", className: "border-[#1c1610] bg-[#1c1610] text-[#e8d5b5]" },
  { value: "ORDER_REJECTED", label: "Order Rejected", className: "border-rose-200 bg-rose-50 text-rose-700" },
];

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

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

function daysPassed(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return days > 0 ? days : null;
}

const VENDOR_ORDER_STATE_VALUES = new Set([
  "ORDER_ACCEPTED",
  "PARTIALLY_DELIVERED",
  "FULLY_DELIVERED",
  "ORDER_REJECTED",
]);

function statesForVendor(current?: string) {
  const allowed = ORDER_STATES.filter((state) => VENDOR_ORDER_STATE_VALUES.has(state.value));
  const currentMeta = ORDER_STATES.find((state) => state.value === current);
  if (currentMeta && !VENDOR_ORDER_STATE_VALUES.has(currentMeta.value)) {
    return [currentMeta, ...allowed];
  }
  return allowed;
}

function paymentLabel(state?: string) {
  if (state === "PARTIAL") return "Partial";
  if (state === "PAID") return "Paid";
  return "Not initiated";
}

export default function ProcurementOrders() {
  const { user } = useAuth();
  const vendorView = isVendorPanelUser(user);
  const [items, setItems] = useState<PurchaseOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"mine" | "approved" | "pending">("mine");
  const [review, setReview] = useState<"approved" | "in_review">("approved");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [preview, setPreview] = useState<PurchaseOrderDto | null>(null);

  const load = async () => {
    const query: Record<string, string | number | undefined> = { limit: 100, search };
    if (mainTab === "pending") query.tab = "pending";
    else if (mainTab === "approved") query.tab = "approved";
    else query.review = review;
    if (kindFilter) query.kind = kindFilter;
    if (stateFilter) query.orderState = stateFilter;
    const data = await purchaseOrdersApi.list(query);
    setItems(data.items || []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [mainTab, review, search, kindFilter, stateFilter]);

  const filterCount = Number(Boolean(search)) + Number(Boolean(kindFilter)) + Number(Boolean(stateFilter));
  const stats = useMemo(() => {
    return {
      overdue: items.filter((row) => Boolean(daysPassed(row.expectedDate))).length,
      po: items.filter((row) => row.kind !== "WO").length,
      wo: items.filter((row) => row.kind === "WO").length,
    };
  }, [items]);

  const openPreview = async (row: PurchaseOrderDto) => {
    setPreview(row);
    try {
      const full = await purchaseOrdersApi.get(row.id);
      setPreview(full);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load order");
    }
  };

  const updateState = async (row: PurchaseOrderDto, orderState: string) => {
    try {
      const updated = await purchaseOrdersApi.update(row.id, { orderState });
      setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
      toastSuccess("Order state updated.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to update state");
    }
  };

  const tabBtn = (active: boolean) =>
    `h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
      active
        ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Procurement
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Orders
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Track purchase and work orders from approval through delivery.
          </p>
        </div>
        {vendorView ? null : (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 w-fit shrink-0 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610] lg:self-auto"
          >
            + Create order
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#3a342c]">
          <StatTile label="On this list" value={loading ? "—" : String(items.length)} />
          <StatTile label="Purchase orders" value={loading ? "—" : String(stats.po)} />
          <StatTile label="Work orders" value={loading ? "—" : String(stats.wo)} />
          <StatTile label="Overdue" value={loading ? "—" : String(stats.overdue)} accent />
        </div>
      </div>

      <div className="flex flex-col gap-3">
      <div className="inline-flex flex-wrap overflow-hidden rounded-xl border border-[#eadfcf] self-start dark:border-[#3a342c]">
        <button type="button" onClick={() => setMainTab("mine")} className={tabBtn(mainTab === "mine")}>
          My orders
        </button>
        <button type="button" onClick={() => setMainTab("approved")} className={tabBtn(mainTab === "approved")}>
          All approved
        </button>
        <button type="button" onClick={() => setMainTab("pending")} className={tabBtn(mainTab === "pending")}>
          Approval pending
        </button>
      </div>

      {mainTab === "mine" ? (
        <div className="inline-flex overflow-hidden rounded-xl border border-[#eadfcf] self-start dark:border-[#3a342c]">
          <button
            type="button"
            onClick={() => setReview("approved")}
            className={tabBtn(review === "approved")}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setReview("in_review")}
            className={tabBtn(review === "in_review")}
          >
            In review
          </button>
        </div>
      ) : null}
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, vendor, or code"
              className={`${fieldClass} pl-10`}
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className={`${fieldClass} lg:max-w-[200px]`}
          >
            <option value="">All types</option>
            <option value="PO">Purchase order</option>
            <option value="WO">Work order</option>
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className={`${fieldClass} lg:max-w-[220px]`}
          >
            <option value="">All states</option>
            {(vendorView ? ORDER_STATES.filter((s) => VENDOR_ORDER_STATE_VALUES.has(s.value)) : ORDER_STATES).map(
              (state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              )
            )}
          </select>
          {filterCount ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setKindFilter("");
                setStateFilter("");
              }}
              className="h-11 shrink-0 rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] hover:bg-white dark:hover:bg-white/10"
            >
              Reset · {filterCount}
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <th className="px-3 py-3.5">S. no.</th>
                <th className="px-3 py-3.5">Order</th>
                <th className="px-3 py-3.5">Vendor</th>
                <th className="px-3 py-3.5">Amount</th>
                <th className="px-3 py-3.5">Payment</th>
                <th className="px-3 py-3.5">Project</th>
                <th className="px-3 py-3.5">Created</th>
                <th className="px-3 py-3.5">Delivery</th>
                <th className="px-3 py-3.5">State</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    Loading orders…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p
                      className="font-serif text-xl text-[#1c1610] dark:text-[#f4efe6]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      No orders yet
                    </p>
                    <p className="mt-1 text-sm text-[#8a7b68]">
                      Create a purchase or work order to start fulfilment.
                    </p>
                    {vendorView ? null : (
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="mt-4 h-10 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
                      >
                        + Create order
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((row, index) => {
                  const overdue = daysPassed(row.expectedDate);
                  const stateMeta = ORDER_STATES.find((item) => item.value === row.orderState) || ORDER_STATES[0];
                  const work = row.kind === "WO";
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                      onClick={() => void openPreview(row)}
                    >
                      <td className="px-3 py-3.5 text-[#8a7b68]">{index + 1}.</td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium uppercase text-[#1c1610] dark:text-[#f3ece2]">{row.title || "—"}</p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            work
                              ? "bg-[#1c1610] text-[#e8d5b5]"
                              : "bg-[#f6efe4] text-[#9a7748] dark:bg-[#c4a574]/15 dark:text-[#e8d5b5]"
                          }`}
                        >
                          {work ? "Work order" : "Purchase order"}
                        </span>
                      </td>
                      <td className="max-w-[140px] px-3 py-3.5 text-[#1c1610] dark:text-[#f3ece2]">
                        {row.vendorRecord?.name || row.vendor}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{money(row.amount)}</p>
                        <p className="text-xs font-semibold text-[#9a7748]">{row.code}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <PaymentBadge state={row.paymentState} />
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[#6b645b]">
                          {row.project?.name || "Unknown"}
                          {row.projectId ? (
                            <Link
                              href={`/projects/${row.projectId}`}
                              onClick={(event) => event.stopPropagation()}
                              className="text-[#9a7748] hover:text-[#1c1610]"
                            >
                              ↗
                            </Link>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-[#6b645b]">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-3.5">
                        <p className="text-[#1c1610] dark:text-[#f3ece2]">{formatDate(row.expectedDate)}</p>
                        {overdue ? (
                          <p className="text-xs font-semibold text-rose-600">{overdue} days passed</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                        <select
                          value={row.orderState}
                          onChange={(e) => void updateState(row, e.target.value)}
                          className={`h-9 max-w-[170px] rounded-full border px-2 text-xs font-medium ${stateMeta.className}`}
                        >
                          {(vendorView ? statesForVendor(row.orderState) : ORDER_STATES).map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AcceptancePreviewDrawer
        open={Boolean(preview)}
        row={preview}
        showReceive={false}
        vendorView={vendorView}
        onClose={() => setPreview(null)}
        onUpdated={(updated) => {
          setPreview(updated);
          setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
        }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <p
        className={`mt-1 font-serif text-2xl ${accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentBadge({ state }: { state?: string }) {
  if (state === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-[#1c1610] px-2.5 py-1 text-[11px] font-semibold text-[#e8d5b5]">
        Paid
      </span>
    );
  }
  if (state === "PARTIAL") {
    return (
      <span className="inline-flex rounded-full bg-[#f6efe4] px-2.5 py-1 text-[11px] font-semibold text-[#9a7748]">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#f4f1eb] px-2.5 py-1 text-[11px] font-semibold text-[#8a7b68]">
      {paymentLabel(state)}
    </span>
  );
}
