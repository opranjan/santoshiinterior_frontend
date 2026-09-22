"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CreateOrderModal from "@/components/procurement/CreateOrderModal";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";

const PINK = "#E85D75";

const ORDER_STATES: Array<{ value: string; label: string; className: string }> = [
  { value: "ORDER_CREATED", label: "Order Created", className: "border-[#5EEAD4] bg-[#F0FDFA] text-[#0F766E]" },
  { value: "NOT_APPROVED", label: "Not Approved", className: "border-gray-200 bg-gray-50 text-gray-500" },
  { value: "INTERNALLY_APPROVED", label: "Internally Approved", className: "border-[#86EFAC] bg-[#F0FDF4] text-[#15803D]" },
  { value: "ORDER_ACCEPTED", label: "Order Accepted", className: "border-[#86EFAC] bg-[#ECFDF5] text-[#047857]" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered", className: "border-gray-200 bg-gray-50 text-gray-500" },
  { value: "FULLY_DELIVERED", label: "Fully Delivered", className: "border-gray-200 bg-gray-50 text-gray-500" },
  { value: "ORDER_REJECTED", label: "Order Rejected", className: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]" },
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

function paymentLabel(state?: string) {
  if (state === "PARTIAL") return "Partial";
  if (state === "PAID") return "Paid";
  return "Not Initiated";
}

export default function ProcurementOrders() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"mine" | "approved" | "pending">("mine");
  const [review, setReview] = useState<"approved" | "in_review">("approved");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filterCount = Number(Boolean(kindFilter)) + Number(Boolean(stateFilter));

  const updateState = async (row: PurchaseOrderDto, orderState: string) => {
    try {
      const updated = await purchaseOrdersApi.update(row.id, { orderState });
      setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
      toastSuccess("Order state updated.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to update state");
    }
  };

  const tabClass = (active: boolean) =>
    `inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium ${
      active ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-500"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-xl font-semibold text-gray-800">Orders</h2>
          <button type="button" onClick={() => setMainTab("mine")} className={tabClass(mainTab === "mine")}>
            ▤ My Orders
          </button>
          <button type="button" onClick={() => setMainTab("approved")} className={tabClass(mainTab === "approved")}>
            ✓ All Approved Orders
          </button>
          <button
            type="button"
            onClick={() => setMainTab("pending")}
            className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium ${
              mainTab === "pending" ? "bg-[#FFF7ED] text-[#EA580C]" : "text-gray-500"
            }`}
          >
            ⚑ Approval Pending
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600"
            >
              ⇆ Filters{filterCount ? `: ${filterCount}` : ""}
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                <label className="mb-1 block text-xs text-gray-500">Order type</label>
                <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="mb-2 h-9 w-full rounded-lg border px-2 text-sm">
                  <option value="">All</option>
                  <option value="PO">Purchase Order</option>
                  <option value="WO">Work Order</option>
                </select>
                <label className="mb-1 block text-xs text-gray-500">Order state</label>
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="h-9 w-full rounded-lg border px-2 text-sm">
                  <option value="">All</option>
                  {ORDER_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-40 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#E85D75]"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: PINK }}
          >
            + Create Order
          </button>
        </div>
      </div>

      {mainTab === "mine" ? (
        <div className="flex gap-4 border-b border-gray-100 text-sm">
          <button
            type="button"
            onClick={() => setReview("approved")}
            className={`pb-2 ${review === "approved" ? "border-b-2 border-[#E85D75] font-medium text-[#E85D75]" : "text-gray-500"}`}
          >
            Approved Orders
          </button>
          <button
            type="button"
            onClick={() => setReview("in_review")}
            className={`pb-2 ${review === "in_review" ? "border-b-2 border-[#E85D75] font-medium text-[#E85D75]" : "text-gray-500"}`}
          >
            In Review
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="text-gray-500">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-3 font-medium">S. no.</th>
              <th className="px-3 py-3 font-medium">Order Name</th>
              <th className="px-3 py-3 font-medium">Vendor Name</th>
              <th className="px-3 py-3 font-medium">Purchase Order</th>
              <th className="px-3 py-3 font-medium">Payment State</th>
              <th className="px-3 py-3 font-medium">Project</th>
              <th className="px-3 py-3 font-medium">Created Date</th>
              <th className="px-3 py-3 font-medium">Delivery Date</th>
              <th className="px-3 py-3 font-medium">Order State</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  Loading orders...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No orders yet. Create one to get started.
                </td>
              </tr>
            ) : (
              items.map((row, index) => {
                const overdue = daysPassed(row.expectedDate);
                const stateMeta = ORDER_STATES.find((item) => item.value === row.orderState) || ORDER_STATES[0];
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-gray-100 hover:bg-[#FFF5F7]"
                    onClick={() => router.push(`/operations/procurement/orders/${row.id}`)}
                  >
                    <td className="px-3 py-3 text-gray-500">{index + 1}.</td>
                    <td className="px-3 py-3">
                      <p className="font-medium uppercase text-gray-800">{row.title || "—"}</p>
                      <p className="text-xs text-gray-400">{row.kind === "WO" ? "Work Order" : "Purchase Order"}</p>
                    </td>
                    <td className="max-w-[140px] px-3 py-3 text-gray-700">{row.vendorRecord?.name || row.vendor}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800">{money(row.amount)}</p>
                      <p className="text-xs font-medium text-[#E85D75]">{row.code}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{paymentLabel(row.paymentState)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        {row.project?.name || "Unknown"}
                        {row.projectId ? (
                          <Link
                            href={`/projects/${row.projectId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="text-[#2563EB]"
                          >
                            ↗
                          </Link>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-3">
                      <p className="text-gray-700">{formatDate(row.expectedDate)}</p>
                      {overdue ? <p className="text-xs font-medium text-[#DC2626]">{overdue} Days Passed</p> : null}
                    </td>
                    <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                      <select
                        value={row.orderState}
                        onChange={(e) => void updateState(row, e.target.value)}
                        className={`h-9 max-w-[170px] rounded-full border px-2 text-xs font-medium ${stateMeta.className}`}
                      >
                        {ORDER_STATES.map((state) => (
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

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
