"use client";

import React, { useEffect, useMemo, useState } from "react";
import { paymentsApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, paymentMethodToEnum } from "@/lib/mappers";
import { mapPayment, toIsoDateOrNull } from "@/lib/crmMappers";
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

type PaymentStatus = "Pending" | "Partial" | "Paid" | "Overdue" | "Cancelled";
type PaymentType =
  | "Advance"
  | "Milestone"
  | "Material"
  | "Handover"
  | "Vendor"
  | "Other";
type PaymentMethod = "UPI" | "Bank Transfer" | "Cash" | "Cheque" | "Card";

type Payment = {
  id: string;
  invoiceNo: string;
  projectId: string;
  projectName: string;
  client: string;
  store: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate: string;
  status: PaymentStatus;
  remark: string;
  createdAt: string;
};

const statuses: PaymentStatus[] = [
  "Pending",
  "Partial",
  "Paid",
  "Overdue",
  "Cancelled",
];

const types: PaymentType[] = [
  "Advance",
  "Milestone",
  "Material",
  "Handover",
  "Vendor",
  "Other",
];

const methods: PaymentMethod[] = [
  "UPI",
  "Bank Transfer",
  "Cash",
  "Cheque",
  "Card",
];

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];

const legacyProjectOptions = [
  { id: "PRJ-101", name: "Desai 3BHK Interiors", client: "Neha & Rohan Desai", store: "Main Branch" },
  { id: "PRJ-102", name: "TechNest Office Fit-out", client: "TechNest Pvt Ltd", store: "Main Branch" },
  { id: "PRJ-103", name: "Malhotra Villa", client: "Rajesh Malhotra", store: "North Store" },
  { id: "PRJ-104", name: "2 BHK Renovation - Ujjain", client: "Meera Joshi", store: "South Store" },
  { id: "PRJ-105", name: "Retail Showroom - North", client: "Suresh Agarwal", store: "North Store" },
];

const statusColor: Record<
  PaymentStatus,
  "warning" | "info" | "success" | "error" | "light"
> = {
  Pending: "warning",
  Partial: "info",
  Paid: "success",
  Overdue: "error",
  Cancelled: "light",
};

const initialPayments: Payment[] = [
  {
    id: "PAY-501",
    invoiceNo: "INV-2401",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    type: "Advance",
    method: "Bank Transfer",
    amount: 480000,
    paidAmount: 480000,
    dueDate: "2026-06-05",
    paidDate: "2026-06-04",
    status: "Paid",
    remark: "40% booking advance received",
    createdAt: "2026-06-01T10:00:00",
  },
  {
    id: "PAY-502",
    invoiceNo: "INV-2402",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    type: "Material",
    method: "UPI",
    amount: 480000,
    paidAmount: 200000,
    dueDate: "2026-07-20",
    paidDate: "2026-07-18",
    status: "Partial",
    remark: "Partial material payment · balance pending",
    createdAt: "2026-07-10T12:00:00",
  },
  {
    id: "PAY-503",
    invoiceNo: "INV-2403",
    projectId: "PRJ-102",
    projectName: "TechNest Office Fit-out",
    client: "TechNest Pvt Ltd",
    store: "Main Branch",
    type: "Advance",
    method: "Bank Transfer",
    amount: 2480000,
    paidAmount: 0,
    dueDate: "2026-07-25",
    paidDate: "",
    status: "Overdue",
    remark: "Awaiting advance confirmation",
    createdAt: "2026-07-15T09:30:00",
  },
  {
    id: "PAY-504",
    invoiceNo: "INV-2404",
    projectId: "PRJ-103",
    projectName: "Malhotra Villa",
    client: "Rajesh Malhotra",
    store: "North Store",
    type: "Advance",
    method: "Cheque",
    amount: 1200000,
    paidAmount: 1200000,
    dueDate: "2026-07-28",
    paidDate: "2026-07-27",
    status: "Paid",
    remark: "Cheque cleared",
    createdAt: "2026-07-22T14:00:00",
  },
  {
    id: "PAY-505",
    invoiceNo: "INV-2405",
    projectId: "PRJ-104",
    projectName: "2 BHK Renovation - Ujjain",
    client: "Meera Joshi",
    store: "South Store",
    type: "Milestone",
    method: "UPI",
    amount: 320000,
    paidAmount: 0,
    dueDate: "2026-08-05",
    paidDate: "",
    status: "Pending",
    remark: "Due on material delivery",
    createdAt: "2026-07-26T11:20:00",
  },
  {
    id: "PAY-506",
    invoiceNo: "INV-2406",
    projectId: "PRJ-105",
    projectName: "Retail Showroom - North",
    client: "Suresh Agarwal",
    store: "North Store",
    type: "Vendor",
    method: "Bank Transfer",
    amount: 185000,
    paidAmount: 0,
    dueDate: "2026-07-15",
    paidDate: "",
    status: "Overdue",
    remark: "Vendor laminate payment overdue",
    createdAt: "2026-07-08T16:45:00",
  },
  {
    id: "PAY-507",
    invoiceNo: "INV-2407",
    projectId: "PRJ-101",
    projectName: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    type: "Handover",
    method: "Bank Transfer",
    amount: 240000,
    paidAmount: 0,
    dueDate: "2026-09-15",
    paidDate: "",
    status: "Pending",
    remark: "Final 20% on handover",
    createdAt: "2026-07-01T08:00:00",
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

function deriveStatus(
  amount: number,
  paidAmount: number,
  dueDate: string,
  current?: PaymentStatus
): PaymentStatus {
  if (current === "Cancelled") return "Cancelled";
  if (paidAmount <= 0) {
    if (dueDate && dueDate < todayIso()) return "Overdue";
    return "Pending";
  }
  if (paidAmount >= amount) return "Paid";
  if (dueDate && dueDate < todayIso()) return "Overdue";
  return "Partial";
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; client: string; store: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [pay, projects, stores] = await Promise.all([
          paymentsApi.list({ limit: 100 }),
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
              client: String(row.clientName || ""),
              store: store?.name || "",
            };
          })
        );
        setPayments(
          pay.items.map((i) => mapPayment(i as Record<string, unknown>) as Payment)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load payments");
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
  const [statusFilter, setStatusFilter] = useState<"All" | PaymentStatus>(
    "All"
  );
  const [typeFilter, setTypeFilter] = useState<"All" | PaymentType>("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [collectId, setCollectId] = useState<string | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("UPI");
  const [collectDate, setCollectDate] = useState(todayIso());

  const emptyForm = {
    invoiceNo: "",
    projectId: "",
    type: "Advance" as PaymentType,
    method: "UPI" as PaymentMethod,
    amount: "",
    paidAmount: "",
    dueDate: "",
    paidDate: "",
    status: "Pending" as PaymentStatus,
    remark: "",
  };

  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return payments.filter((p) => {
      const matchSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        p.invoiceNo.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.projectId.toLowerCase().includes(q);
      const matchStore =
        storeFilter === "All Stores" || p.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || p.status === statusFilter;
      const matchType = typeFilter === "All" || p.type === typeFilter;
      return matchSearch && matchStore && matchStatus && matchType;
    });
  }, [payments, search, storeFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const received = payments.reduce((s, p) => s + p.paidAmount, 0);
    const total = payments.reduce((s, p) => s + p.amount, 0);
    const pending = payments
      .filter((p) => p.status === "Pending" || p.status === "Partial")
      .reduce((s, p) => s + (p.amount - p.paidAmount), 0);
    const overdue = payments
      .filter((p) => p.status === "Overdue")
      .reduce((s, p) => s + (p.amount - p.paidAmount), 0);
    const overdueCount = payments.filter((p) => p.status === "Overdue").length;
    return { received, total, pending, overdue, overdueCount };
  }, [payments]);

  const selectedProject = apiProjects.find((p) => p.id === form.projectId);

  const openAdd = () => {
    setError("");
    setEditing(null);
    setForm({
      ...emptyForm,
      projectId: apiProjects[0]?.id || "",
      invoiceNo: `INV-${2400 + payments.length + 1}`,
      dueDate: todayIso(),
    });
    setShowForm(true);
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      invoiceNo: p.invoiceNo,
      projectId: p.projectId,
      type: p.type,
      method: p.method,
      amount: String(p.amount),
      paidAmount: String(p.paidAmount),
      dueDate: p.dueDate,
      paidDate: p.paidDate,
      status: p.status,
      remark: p.remark,
    });
    setShowForm(true);
  };

  const savePayment = async () => {
    const amount = Number(form.amount) || 0;
    const paidAmount = Number(form.paidAmount) || 0;
    if (!form.invoiceNo.trim()) {
      setError("Invoice number is required");
      return;
    }
    if (amount <= 0) {
      setError("Payment amount must be greater than 0");
      return;
    }

    const status = deriveStatus(
      amount,
      paidAmount,
      form.dueDate,
      form.status
    );

    const storeId = selectedProject
      ? storeOptions.find((s) => s.name === selectedProject.store)?.id || null
      : null;

    const apiPayload = {
      invoiceNo: form.invoiceNo.trim(),
      projectId: selectedProject?.id || null,
      storeId,
      clientName: selectedProject?.client || null,
      type: labelToEnum(form.type),
      method: paymentMethodToEnum(form.method),
      amount,
      paidAmount: Math.min(paidAmount, amount),
      dueDate: toIsoDateOrNull(form.dueDate),
      paidDate:
        paidAmount > 0
          ? toIsoDateOrNull(form.paidDate || todayIso())
          : null,
      status: labelToEnum(status),
      remark: form.remark.trim() || null,
    };

    try {
      setError("");
      if (editing) {
        const updated = (await paymentsApi.update(
          editing.id,
          apiPayload
        )) as Record<string, unknown>;
        setPayments((prev) =>
          prev.map((p) =>
            p.id === editing.id ? (mapPayment(updated) as Payment) : p
          )
        );
      } else {
        const created = (await paymentsApi.create(
          apiPayload
        )) as Record<string, unknown>;
        setPayments((prev) => [mapPayment(created) as Payment, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment");
    }
  };

  const openCollect = (p: Payment) => {
    const balance = p.amount - p.paidAmount;
    setCollectId(p.id);
    setCollectAmount(String(balance > 0 ? balance : 0));
    setCollectMethod(p.method);
    setCollectDate(todayIso());
  };

  const applyCollect = () => {
    if (!collectId) return;
    const add = Number(collectAmount) || 0;
    if (add <= 0) return;

    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== collectId) return p;
        const paidAmount = Math.min(p.amount, p.paidAmount + add);
        return {
          ...p,
          paidAmount,
          paidDate: collectDate || todayIso(),
          method: collectMethod,
          status: deriveStatus(p.amount, paidAmount, p.dueDate),
          remark:
            paidAmount >= p.amount
              ? p.remark || "Fully paid"
              : `Collected ${formatMoney(add)} · balance ${formatMoney(p.amount - paidAmount)}`,
        };
      })
    );
    setCollectId(null);
    setCollectAmount("");
  };

  const markPaid = (id: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              paidAmount: p.amount,
              paidDate: todayIso(),
              status: "Paid",
              remark: p.remark || "Marked as paid",
            }
          : p
      )
    );
  };

  const updateStatus = (id: string, status: PaymentStatus) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (status === "Paid") {
          return {
            ...p,
            status,
            paidAmount: p.amount,
            paidDate: p.paidDate || todayIso(),
          };
        }
        if (status === "Pending") {
          return { ...p, status, paidAmount: 0, paidDate: "" };
        }
        return { ...p, status };
      })
    );
  };

  const collecting = collectId
    ? payments.find((p) => p.id === collectId)
    : null;

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
            Payments
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track customer installments and vendor payments by project.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects">
            <Button size="sm" variant="outline">
              View Projects
            </Button>
          </Link>
          <Button size="sm" onClick={openAdd}>
            + Record Payment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Total Invoiced</p>
          <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            {formatMoney(stats.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Received</p>
          <p className="mt-1 text-lg font-semibold text-success-600">
            {formatMoney(stats.received)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="mt-1 text-lg font-semibold text-warning-600">
            {formatMoney(stats.pending)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500">
            Overdue ({stats.overdueCount})
          </p>
          <p className="mt-1 text-lg font-semibold text-error-500">
            {formatMoney(stats.overdue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 sm:max-w-xs">
          <Input
            type="text"
            placeholder="Search invoice, project, client…"
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
            setStatusFilter(e.target.value as "All" | PaymentStatus)
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
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "All" | PaymentType)
          }
          className={selectClass}
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1300px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Invoice",
                    "Project / Client",
                    "Type",
                    "Amount",
                    "Paid",
                    "Balance",
                    "Due Date",
                    "Status",
                    "Method",
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
                {filtered.map((p) => {
                  const balance = Math.max(0, p.amount - p.paidAmount);
                  return (
                    <TableRow
                      key={p.id}
                      className={
                        p.status === "Overdue"
                          ? "bg-error-50/40 dark:bg-error-500/5"
                          : undefined
                      }
                    >
                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {p.invoiceNo}
                        </p>
                        <p className="text-xs text-gray-400">{p.id}</p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {p.projectName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.client} · {p.store}
                        </p>
                        <p className="text-xs text-gray-400">{p.projectId}</p>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {p.type}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                        {formatMoney(p.amount)}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-success-600 whitespace-nowrap">
                        {formatMoney(p.paidAmount)}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatMoney(balance)}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-start whitespace-nowrap">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(p.dueDate)}
                        </p>
                        {p.paidDate && (
                          <p className="text-xs text-gray-400">
                            Paid {formatDate(p.paidDate)}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge size="sm" color={statusColor[p.status]}>
                            {p.status}
                          </Badge>
                          <select
                            value={p.status}
                            onChange={(e) =>
                              updateStatus(
                                p.id,
                                e.target.value as PaymentStatus
                              )
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

                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {p.method}
                      </TableCell>

                      <TableCell className="px-4 py-3 max-w-[200px]">
                        <p className="line-clamp-2 text-sm text-gray-500">
                          {p.remark || "—"}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {balance > 0 && p.status !== "Cancelled" && (
                            <>
                              <button
                                type="button"
                                onClick={() => openCollect(p)}
                                className="text-left text-sm font-medium text-brand-500 hover:text-brand-600"
                              >
                                Collect
                              </button>
                              <button
                                type="button"
                                onClick={() => markPaid(p.id)}
                                className="text-left text-sm font-medium text-success-600 hover:text-success-700"
                              >
                                Mark Paid
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="text-left text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                          >
                            Edit
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                      No payments match your filters.
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editing ? "Edit Payment" : "Record Payment"}
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
                <Label>Invoice No</Label>
                <input
                  type="text"
                  value={form.invoiceNo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoiceNo: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Project</Label>
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
                      {p.name} · {p.client}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Payment Type</Label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as PaymentType,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Method</Label>
                <select
                  value={form.method}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      method: e.target.value as PaymentMethod,
                    }))
                  }
                  className={`${selectClass} w-full`}
                >
                  {methods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0"
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
                  placeholder="0"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Paid Date</Label>
                <input
                  type="date"
                  value={form.paidDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Remark</Label>
                <textarea
                  rows={2}
                  value={form.remark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remark: e.target.value }))
                  }
                  placeholder="Payment note…"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
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
                onClick={savePayment}
                disabled={!form.invoiceNo.trim() || !Number(form.amount)}
              >
                {editing ? "Save Changes" : "Save Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collect modal */}
      {collecting && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Collect Payment
                </h3>
                <p className="text-sm text-gray-500">
                  {collecting.invoiceNo} · Balance{" "}
                  {formatMoney(
                    Math.max(0, collecting.amount - collecting.paidAmount)
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCollectId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Amount Received (₹)</Label>
                <input
                  type="number"
                  min={0}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Method</Label>
                <select
                  value={collectMethod}
                  onChange={(e) =>
                    setCollectMethod(e.target.value as PaymentMethod)
                  }
                  className={`${selectClass} w-full`}
                >
                  {methods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Payment Date</Label>
                <input
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCollectId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyCollect}
                disabled={!Number(collectAmount)}
              >
                Confirm Collection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
