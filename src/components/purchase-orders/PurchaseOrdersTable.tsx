"use client";

import React, { useEffect, useMemo, useState } from "react";
import { purchaseOrdersApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, materialCategoryToEnum } from "@/lib/mappers";
import { mapPurchaseOrder, toIsoDateOrNull } from "@/lib/crmMappers";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type POStatus =
  | "Draft"
  | "Sent"
  | "Confirmed"
  | "Partial"
  | "Received"
  | "Cancelled";

type MaterialCategory =
  | "Laminate"
  | "Plywood / Board"
  | "Hardware"
  | "Glass"
  | "Stone / Quartz"
  | "Paint"
  | "Electrical"
  | "Other";

type PurchaseItem = {
  name: string;
  qty: number;
  unit: string;
  rate: number;
};

type PurchaseOrder = {
  id: string;
  vendor: string;
  projectId: string;
  projectName: string;
  store: string;
  category: MaterialCategory;
  status: POStatus;
  items: PurchaseItem[];
  amount: number;
  paidAmount: number;
  orderDate: string;
  expectedDate: string;
  receivedDate: string;
  remark: string;
  createdAt: string;
};

const statuses: POStatus[] = [
  "Draft",
  "Sent",
  "Confirmed",
  "Partial",
  "Received",
  "Cancelled",
];

const categories: MaterialCategory[] = [
  "Laminate",
  "Plywood / Board",
  "Hardware",
  "Glass",
  "Stone / Quartz",
  "Paint",
  "Electrical",
  "Other",
];

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];

const vendors = [
  "Greenply Industries",
  "CenturyPly",
  "Merino Laminates",
  "Hettich Hardware",
  "Asian Paints",
  "Kajaria / Local Stone",
  "Local Fabricator",
];

const legacyProjectOptions = [
  { id: "PRJ-101", name: "Desai 3BHK Interiors", store: "Main Branch" },
  { id: "PRJ-102", name: "TechNest Office Fit-out", store: "Main Branch" },
  { id: "PRJ-103", name: "Malhotra Villa", store: "North Store" },
  { id: "PRJ-104", name: "2 BHK Renovation - Ujjain", store: "South Store" },
  { id: "GEN-STOCK", name: "Store Stock (General)", store: "Main Branch" },
];

const statusColor: Record<
  POStatus,
  "light" | "info" | "primary" | "warning" | "success" | "error"
> = {
  Draft: "light",
  Sent: "info",
  Confirmed: "primary",
  Partial: "warning",
  Received: "success",
  Cancelled: "error",
};

const initialOrders: PurchaseOrder[] = [
  {
    id: "PO-801",
    vendor: "Merino Laminates",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    store: "Main Branch",
    category: "Laminate",
    status: "Partial",
    items: [
      { name: "Walnut Laminate 1.0mm", qty: 25, unit: "Sheets", rate: 1850 },
      { name: "White Matt Laminate", qty: 12, unit: "Sheets", rate: 1450 },
    ],
    amount: 63650,
    paidAmount: 30000,
    orderDate: "2026-07-12",
    expectedDate: "2026-07-25",
    receivedDate: "2026-07-24",
    remark: "Walnut lot received · white matt pending",
    createdAt: "2026-07-12T10:00:00",
  },
  {
    id: "PO-802",
    vendor: "CenturyPly",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    store: "Main Branch",
    category: "Plywood / Board",
    status: "Confirmed",
    items: [
      { name: "Marine Ply 19mm", qty: 40, unit: "Sheets", rate: 3200 },
      { name: "MDF 18mm", qty: 20, unit: "Sheets", rate: 1450 },
    ],
    amount: 157000,
    paidAmount: 0,
    orderDate: "2026-07-20",
    expectedDate: "2026-08-02",
    receivedDate: "",
    remark: "Vendor confirmed dispatch next week",
    createdAt: "2026-07-20T14:20:00",
  },
  {
    id: "PO-803",
    vendor: "Hettich Hardware",
    projectId: "PRJ-102",
    projectName: "TechNest Office Fit-out",
    store: "Main Branch",
    category: "Hardware",
    status: "Received",
    items: [
      { name: "Soft-close hinges", qty: 120, unit: "Nos", rate: 95 },
      { name: "Drawer channels", qty: 40, unit: "Pairs", rate: 420 },
    ],
    amount: 28200,
    paidAmount: 28200,
    orderDate: "2026-07-08",
    expectedDate: "2026-07-18",
    receivedDate: "2026-07-17",
    remark: "Fully received & billed",
    createdAt: "2026-07-08T09:30:00",
  },
  {
    id: "PO-804",
    vendor: "Kajaria / Local Stone",
    projectId: "PRJ-103",
    projectName: "Malhotra Villa",
    store: "North Store",
    category: "Stone / Quartz",
    status: "Sent",
    items: [
      { name: "Quartz Countertop", qty: 45, unit: "Sq.ft", rate: 380 },
    ],
    amount: 17100,
    paidAmount: 0,
    orderDate: "2026-07-28",
    expectedDate: "2026-08-10",
    receivedDate: "",
    remark: "Awaiting vendor confirmation",
    createdAt: "2026-07-28T11:00:00",
  },
  {
    id: "PO-805",
    vendor: "Asian Paints",
    projectId: "PRJ-104",
    projectName: "2 BHK Renovation - Ujjain",
    store: "South Store",
    category: "Paint",
    status: "Draft",
    items: [
      { name: "Royale Emulsion", qty: 40, unit: "Ltr", rate: 520 },
      { name: "Primer", qty: 20, unit: "Ltr", rate: 280 },
    ],
    amount: 26400,
    paidAmount: 0,
    orderDate: "2026-07-30",
    expectedDate: "2026-08-05",
    receivedDate: "",
    remark: "Draft · pending approval",
    createdAt: "2026-07-30T16:40:00",
  },
  {
    id: "PO-806",
    vendor: "Greenply Industries",
    projectId: "GEN-STOCK",
    projectName: "Store Stock (General)",
    store: "Main Branch",
    category: "Plywood / Board",
    status: "Confirmed",
    items: [
      { name: "BWP Ply 12mm", qty: 30, unit: "Sheets", rate: 2100 },
    ],
    amount: 63000,
    paidAmount: 20000,
    orderDate: "2026-07-15",
    expectedDate: "2026-07-28",
    receivedDate: "",
    remark: "Stock replenishment for Main Branch",
    createdAt: "2026-07-15T12:10:00",
  },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function calcAmount(items: PurchaseItem[]) {
  return items.reduce((sum, i) => sum + i.qty * i.rate, 0);
}

function isOverdue(po: PurchaseOrder) {
  if (
    !po.expectedDate ||
    po.status === "Received" ||
    po.status === "Cancelled"
  ) {
    return false;
  }
  return po.expectedDate < todayIso();
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const smallFieldClass =
  "h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function PurchaseOrdersTable() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; store: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [po, projects, stores] = await Promise.all([
          purchaseOrdersApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setApiProjects(
          projects.items.map((p) => {
            const row = p as Record<string, unknown>;
            const store = row.store as { name?: string } | null;
            return {
              id: String(row.id),
              name: String(row.name || ""),
              store: store?.name || "",
            };
          })
        );
        setOrders(
          po.items.map(
            (i) => mapPurchaseOrder(i as Record<string, unknown>) as PurchaseOrder
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load purchase orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All" | POStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<
    "All" | MaterialCategory
  >("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);

  const emptyItem: PurchaseItem = {
    name: "",
    qty: 1,
    unit: "Nos",
    rate: 0,
  };

  const emptyForm = {
    vendor: vendors[0],
    projectId: "",
    category: "Laminate" as MaterialCategory,
    status: "Draft" as POStatus,
    orderDate: todayIso(),
    expectedDate: "",
    paidAmount: "",
    remark: "",
    items: [{ ...emptyItem, name: "" }] as PurchaseItem[],
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((po) => {
      const matchSearch =
        !q ||
        po.id.toLowerCase().includes(q) ||
        po.vendor.toLowerCase().includes(q) ||
        po.projectName.toLowerCase().includes(q) ||
        po.items.some((i) => i.name.toLowerCase().includes(q));
      const matchStore =
        storeFilter === "All Stores" || po.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || po.status === statusFilter;
      const matchCategory =
        categoryFilter === "All" || po.category === categoryFilter;
      return matchSearch && matchStore && matchStatus && matchCategory;
    });
  }, [orders, search, storeFilter, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const totalValue = orders.reduce((s, p) => s + p.amount, 0);
    const open = orders.filter(
      (p) =>
        p.status === "Draft" ||
        p.status === "Sent" ||
        p.status === "Confirmed" ||
        p.status === "Partial"
    ).length;
    const received = orders.filter((p) => p.status === "Received").length;
    const overdue = orders.filter((p) => isOverdue(p)).length;
    const unpaid = orders.reduce(
      (s, p) => s + Math.max(0, p.amount - p.paidAmount),
      0
    );
    return {
      total: orders.length,
      totalValue,
      open,
      received,
      overdue,
      unpaid,
    };
  }, [orders]);

  const selectedProject = apiProjects.find((p) => p.id === form.projectId);
  const formAmount = calcAmount(form.items);

  const openAdd = () => {
    setError("");
    setEditing(null);
    setForm({
      ...emptyForm,
      projectId: apiProjects[0]?.id || "",
      orderDate: todayIso(),
      items: [{ ...emptyItem }],
    });
    setShowForm(true);
  };

  const openEdit = (po: PurchaseOrder) => {
    setEditing(po);
    setForm({
      vendor: po.vendor,
      projectId: po.projectId,
      category: po.category,
      status: po.status,
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      paidAmount: String(po.paidAmount),
      remark: po.remark,
      items: po.items.length ? po.items.map((i) => ({ ...i })) : [{ ...emptyItem }],
    });
    setShowForm(true);
  };

  const updateItem = (
    index: number,
    patch: Partial<PurchaseItem>
  ) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addItemRow = () => {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  };

  const removeItemRow = (index: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.length <= 1 ? f.items : f.items.filter((_, i) => i !== index),
    }));
  };

  const saveOrder = async () => {
    if (!form.vendor?.trim()) {
      setError("Vendor is required");
      return;
    }
    const items = form.items.filter((i) => i.name.trim() && i.qty > 0);
    if (!items.length) {
      setError("Add at least one purchase item with name and qty");
      return;
    }

    const amount = calcAmount(items);
    const paidAmount = Math.min(amount, Number(form.paidAmount) || 0);
    const status =
      form.status === "Cancelled"
        ? form.status
        : form.status === "Received"
          ? "Received"
          : form.status;

    const storeId = selectedProject
      ? storeOptions.find((s) => s.name === selectedProject.store)?.id || null
      : null;

    const apiPayload = {
      vendor: form.vendor.trim(),
      projectId: selectedProject?.id || null,
      storeId,
      category: materialCategoryToEnum(form.category),
      status: labelToEnum(status),
      amount,
      paidAmount,
      orderDate: toIsoDateOrNull(form.orderDate || todayIso()),
      expectedDate: toIsoDateOrNull(form.expectedDate),
      receivedDate:
        status === "Received"
          ? toIsoDateOrNull(editing?.receivedDate || todayIso())
          : null,
      remark: form.remark.trim() || null,
      items: items.map((i) => ({
        name: i.name.trim(),
        qty: i.qty,
        unit: i.unit,
        rate: i.rate,
      })),
    };

    try {
      setError("");
      if (editing) {
        const updated = (await purchaseOrdersApi.update(
          editing.id,
          apiPayload
        )) as Record<string, unknown>;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === editing.id
              ? (mapPurchaseOrder(updated) as PurchaseOrder)
              : o
          )
        );
      } else {
        const created = (await purchaseOrdersApi.create(
          apiPayload
        )) as Record<string, unknown>;
        setOrders((prev) => [
          mapPurchaseOrder(created) as PurchaseOrder,
          ...prev,
        ]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save purchase order"
      );
    }
  };

  const updateStatus = (id: string, status: POStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              receivedDate:
                status === "Received" ? o.receivedDate || todayIso() : "",
              paidAmount:
                status === "Received" && o.paidAmount === 0
                  ? o.amount
                  : o.paidAmount,
            }
          : o
      )
    );
  };

  const markReceived = (id: string) => updateStatus(id, "Received");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Purchase Orders
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Raise and track material POs for projects and store stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/payments">
            <Button size="sm" variant="outline">
              Payments
            </Button>
          </Link>
          <Link href="/projects">
            <Button size="sm" variant="outline">
              Projects
            </Button>
          </Link>
          <Button size="sm" onClick={openAdd}>
            + New PO
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Total POs</p>
          <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">PO Value</p>
          <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            {formatMoney(stats.totalValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Open</p>
          <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
            {stats.open}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Received</p>
          <p className="mt-1 text-xl font-semibold text-success-600">
            {stats.received}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Overdue</p>
          <p className="mt-1 text-xl font-semibold text-error-500">
            {stats.overdue}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Unpaid</p>
          <p className="mt-1 text-lg font-semibold text-warning-600">
            {formatMoney(stats.unpaid)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 sm:max-w-xs">
          <Input
            type="text"
            placeholder="Search PO, vendor, material…"
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className={selectClass}
        >
          {stores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All" | POStatus)
          }
          className={selectClass}
        >
          <option value="All">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as "All" | MaterialCategory)
          }
          className={selectClass}
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1350px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "PO",
                    "Vendor",
                    "Project",
                    "Category",
                    "Items",
                    "Amount",
                    "Paid",
                    "Status",
                    "Expected",
                    "Remark",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filtered.map((po) => {
                  const overdue = isOverdue(po);
                  return (
                    <TableRow
                      key={po.id}
                      className={
                        overdue
                          ? "bg-error-50/40 dark:bg-error-500/5"
                          : undefined
                      }
                    >
                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {po.id}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(po.orderDate)}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {po.vendor}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {po.projectName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {po.projectId} · {po.store}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {po.category}
                      </TableCell>

                      <TableCell className="px-4 py-3 max-w-[200px]">
                        <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                          {po.items
                            .map((i) => `${i.name} (${i.qty} ${i.unit})`)
                            .join(", ")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {po.items.length} line
                          {po.items.length > 1 ? "s" : ""}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                        {formatMoney(po.amount)}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-success-600 whitespace-nowrap">
                        {formatMoney(po.paidAmount)}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge size="sm" color={statusColor[po.status]}>
                            {po.status}
                          </Badge>
                          <select
                            value={po.status}
                            onChange={(e) =>
                              updateStatus(po.id, e.target.value as POStatus)
                            }
                            className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p
                          className={`text-sm ${
                            overdue
                              ? "font-medium text-error-500"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {formatDate(po.expectedDate)}
                        </p>
                        {po.receivedDate && (
                          <p className="text-xs text-gray-400">
                            Recd {formatDate(po.receivedDate)}
                          </p>
                        )}
                        {overdue && (
                          <p className="text-xs text-error-500">Overdue</p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 max-w-[180px]">
                        <p className="line-clamp-2 text-sm text-gray-500">
                          {po.remark || "—"}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(po)}
                            className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Edit
                          </button>
                          {po.status !== "Received" &&
                            po.status !== "Cancelled" && (
                              <button
                                type="button"
                                onClick={() => markReceived(po.id)}
                                className="text-left text-sm font-medium text-success-600 hover:text-success-700"
                              >
                                Mark Received
                              </button>
                            )}
                          <Link
                            href="/payments"
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Payment
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                      No purchase orders match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editing ? "Edit Purchase Order" : "New Purchase Order"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Vendor</Label>
                <select
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {vendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Project / Stock</Label>
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectId: e.target.value }))
                  }
                  className={`${selectClass} w-full`}
                >
                  <option value="">Select project (optional)</option>
                  {apiProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as MaterialCategory,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as POStatus,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Order Date</Label>
                <input
                  type="date"
                  value={form.orderDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, orderDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <input
                  type="date"
                  value={form.expectedDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expectedDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Paid Amount (₹)</Label>
                <input
                  type="number"
                  min={0}
                  value={form.paidAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidAmount: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div className="flex items-end">
                <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
                  <p className="text-xs text-gray-500">Estimated Total</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {formatMoney(formAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <Label>Material Items</Label>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600"
                >
                  + Add line
                </button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 rounded-xl border border-gray-100 p-2 dark:border-gray-800"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          updateItem(index, { name: e.target.value })
                        }
                        placeholder="Material name"
                        className={smallFieldClass}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min={0}
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, {
                            qty: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="Qty"
                        className={smallFieldClass}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(index, { unit: e.target.value })
                        }
                        placeholder="Unit"
                        className={smallFieldClass}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        min={0}
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(index, {
                            rate: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="Rate"
                        className={smallFieldClass}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-gray-400 hover:text-error-500"
                        aria-label="Remove line"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Label>Remark</Label>
              <textarea
                rows={2}
                value={form.remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
                placeholder="Delivery notes / vendor remarks…"
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveOrder}
                disabled={!form.items.some((i) => i.name.trim())}
              >
                {editing ? "Save Changes" : "Create PO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
