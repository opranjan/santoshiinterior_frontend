"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { paymentsApi, projectsApi } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
};

type PaymentRow = {
  id: string;
  type?: string | null;
  invoiceNo?: string | null;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  method?: string;
  paidDate?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  clientName?: string | null;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    clientName?: string | null;
  } | null;
};

const PAGE_SIZE = 5;

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number.isFinite(amount) ? amount : 0
  );

function money(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function codeFromId(prefix: string, id: string) {
  const digits = id.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `${prefix}-${digits}`;
}

function methodLabel(method?: string) {
  const key = String(method || "").toUpperCase();
  if (key === "BANK_TRANSFER") return "NEFT";
  return enumToLabel(method || "UPI");
}

function isDlp(row: PaymentRow) {
  return String(row.type || "").toUpperCase() === "DLP";
}

type ProjectDlp = {
  id: string;
  name: string;
  customer: string;
  dlpAmount: number;
  paid: number;
  pending: number;
  dlpDate: string | null;
};

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";

export default function FranchiseeDlpPayments() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectPage, setProjectPage] = useState(1);
  const [showAllTxn, setShowAllTxn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 100, type: "DLP" }),
        ]);
        if (cancelled) return;
        setProjects((projectRes.items || []) as ProjectRow[]);
        setPayments((paymentRes.items || []) as PaymentRow[]);
      } catch {
        if (!cancelled) {
          setProjects([]);
          setPayments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedIds = useMemo(() => new Set(projects.map((row) => row.id)), [projects]);

  const dlpPayments = useMemo(
    () =>
      payments.filter((row) => {
        const projectId = row.projectId || row.project?.id;
        if (!projectId || !assignedIds.has(projectId)) return false;
        return isDlp(row);
      }),
    [payments, assignedIds]
  );

  const byProject = useMemo(() => {
    const map = new Map<string, ProjectDlp>();
    for (const row of dlpPayments) {
      const id = row.projectId || row.project?.id;
      if (!id) continue;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: row.project?.name || "—",
          customer: row.project?.clientName || row.clientName || "",
          dlpAmount: 0,
          paid: 0,
          pending: 0,
          dlpDate: row.dueDate || row.paidDate || row.createdAt || null,
        });
      }
      const item = map.get(id)!;
      item.dlpAmount += money(row.amount);
      item.paid += money(row.paidAmount);
      const at = row.dueDate || row.paidDate || row.createdAt || null;
      if (at && (!item.dlpDate || at < item.dlpDate)) item.dlpDate = at;
    }
    return [...map.values()].map((item) => ({
      ...item,
      pending: Math.max(0, item.dlpAmount - item.paid),
    }));
  }, [dlpPayments]);

  const filteredProjects = useMemo(() => {
    return byProject.filter((row) => {
      if (statusFilter === "paid") return row.pending <= 0 && row.paid > 0;
      if (statusFilter === "partial") return row.paid > 0 && row.pending > 0;
      if (statusFilter === "unpaid") return row.paid <= 0;
      return true;
    });
  }, [byProject, statusFilter]);

  const totals = useMemo(() => {
    const dlpAmount = byProject.reduce((sum, row) => sum + row.dlpAmount, 0);
    const paid = byProject.reduce((sum, row) => sum + row.paid, 0);
    return {
      cases: byProject.length,
      dlpAmount,
      paid,
      pending: Math.max(0, dlpAmount - paid),
    };
  }, [byProject]);

  const projectPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice(
    (projectPage - 1) * PAGE_SIZE,
    projectPage * PAGE_SIZE
  );
  const txnRows = showAllTxn ? dlpPayments : dlpPayments.slice(0, 5);

  const payStatus = (row: ProjectDlp) => {
    if (row.paid > 0 && row.pending <= 0) return { label: "Paid", color: "success" as const };
    if (row.paid > 0) return { label: "Partially Paid", color: "warning" as const };
    return { label: "Unpaid", color: "error" as const };
  };

  const downloadCsv = () => {
    const header = [
      "Project",
      "Customer",
      "Project ID",
      "DLP Amount",
      "Paid by Company",
      "Pending",
      "DLP Date",
      "Status",
    ];
    const lines = filteredProjects.map((row) =>
      [
        row.name,
        row.customer,
        codeFromId("PROJ", row.id),
        row.dlpAmount,
        row.paid,
        row.pending,
        row.dlpDate ? formatDate(row.dlpDate) : "",
        payStatus(row).label,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dlp-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReceipt = (row: PaymentRow) => {
    const txn = row.invoiceNo || codeFromId("DLP", row.id);
    const body = [
      "Santoshi Interior — DLP Receipt",
      `Transaction: ${txn}`,
      `Project: ${row.project?.name || ""}`,
      `Customer: ${row.project?.clientName || row.clientName || ""}`,
      `DLP Amount: ${money(row.amount)}`,
      `Paid by Company: ${money(row.paidAmount)}`,
      `Date: ${formatDate(row.paidDate || row.createdAt)}`,
      `Mode: ${methodLabel(row.method)}`,
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${txn}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">
            Dashboard
          </Link>
          <span className="mx-1">›</span>
          <span className="text-gray-800 dark:text-white/90">DLP Payment</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
          DLP Payment
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View all Delay in Payments (DLP) and payments made by the company.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-gray-500">Total DLP Cases</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {loading ? "—" : totals.cases}
          </p>
          <p className="mt-2 text-xs font-medium text-brand-600">View Details</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Total DLP Amount</p>
          <p className="mt-2 text-2xl font-semibold text-warning-600">
            {formatINR(totals.dlpAmount)}
          </p>
          <p className="mt-2 text-xs text-gray-400">View Details</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Total Paid by Company</p>
          <p className="mt-2 text-2xl font-semibold text-success-600">
            {formatINR(totals.paid)}
          </p>
          <p className="mt-2 text-xs text-gray-400">View Details</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Pending DLP Amount</p>
          <p className="mt-2 text-2xl font-semibold text-error-500">
            {formatINR(totals.pending)}
          </p>
          <p className="mt-2 text-xs text-gray-400">View Details</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            DLP Summary by Project
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setProjectPage(1);
              }}
              className="h-9 rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              Download
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Site / Project Name</th>
                <th className="px-4 py-2">Project ID</th>
                <th className="px-4 py-2">DLP Amount (₹)</th>
                <th className="px-4 py-2">Paid by Company (₹)</th>
                <th className="px-4 py-2">Pending Amount (₹)</th>
                <th className="px-4 py-2">DLP Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pagedProjects.map((row, index) => {
                const status = payStatus(row);
                return (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 text-gray-500">
                      {(projectPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white/90">{row.name}</p>
                      {row.customer ? (
                        <p className="text-xs text-gray-400">{row.customer}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{codeFromId("PROJ", row.id)}</td>
                    <td className="px-4 py-3">{formatAmount(row.dlpAmount)}</td>
                    <td className="px-4 py-3 font-medium text-success-600">
                      {formatAmount(row.paid)}
                    </td>
                    <td className="px-4 py-3 font-medium text-error-500">
                      {row.pending ? formatAmount(row.pending) : "0"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.dlpDate ? formatDate(row.dlpDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/projects" className="text-gray-400 hover:text-brand-600">
                        ›
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && !pagedProjects.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No DLP cases yet. The company records DLP when a customer delays payment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-500">
          <p>
            Showing {filteredProjects.length ? (projectPage - 1) * PAGE_SIZE + 1 : 0} to{" "}
            {Math.min(projectPage * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length}{" "}
            entries
          </p>
          <div className="flex gap-1">
            {Array.from({ length: projectPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setProjectPage(page)}
                className={`h-8 w-8 rounded-lg text-sm ${
                  page === projectPage
                    ? "bg-brand-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            DLP Payment History
          </h2>
          <p className="text-xs text-gray-500">
            Payment transactions made by the company for DLP.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Site / Project Name</th>
                <th className="px-4 py-2">Transaction ID</th>
                <th className="px-4 py-2">DLP Amount (₹)</th>
                <th className="px-4 py-2">Paid Amount (₹)</th>
                <th className="px-4 py-2">Payment Date</th>
                <th className="px-4 py-2">Payment Mode</th>
                <th className="px-4 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {txnRows.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {row.project?.name || "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {row.project?.clientName || row.clientName || ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.invoiceNo || codeFromId("DLP", row.id)}
                  </td>
                  <td className="px-4 py-3">{formatAmount(money(row.amount))}</td>
                  <td className="px-4 py-3 font-medium text-success-600">
                    {formatAmount(money(row.paidAmount))}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(row.paidDate || row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{methodLabel(row.method)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => downloadReceipt(row)}
                      className="text-gray-500 hover:text-brand-600"
                      aria-label="Download receipt"
                    >
                      ↓
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !txnRows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No DLP settlements yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {dlpPayments.length > 5 ? (
          <div className="px-4 py-3">
            <Button size="sm" variant="outline" onClick={() => setShowAllTxn((v) => !v)}>
              {showAllTxn ? "Show less" : "View All Transactions"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-gray-300">
        DLP (Delay in Payments) are amounts delayed by customers. Company settles DLP as per
        agreed terms.
      </div>
    </div>
  );
}
