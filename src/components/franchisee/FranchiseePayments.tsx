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
  address?: string | null;
  budget?: string | null;
};

type PaymentRow = {
  id: string;
  type?: string | null;
  invoiceNo?: string | null;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  method?: string;
  remark?: string | null;
  paidDate?: string | null;
  createdAt?: string;
  clientName?: string | null;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    clientName?: string | null;
    address?: string | null;
    budget?: string | null;
  } | null;
  createdBy?: { id: string; name: string } | null;
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

function budgetOf(project?: { budget?: string | null } | null) {
  if (!project?.budget) return 0;
  const n = Number(String(project.budget).replace(/[^\d.]/g, ""));
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

type ProjectPay = {
  id: string;
  name: string;
  location: string;
  projectAmount: number;
  paid: number;
  pending: number;
  lastPaidAt: string | null;
};

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";

export default function FranchiseePayments() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectPage, setProjectPage] = useState(1);
  const [showAllTxn, setShowAllTxn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 100, type: "FRANCHISEE_PAYOUT" }),
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

  const inRange = (iso?: string | null) => {
    if (!from && !to) return true;
    if (!iso) return false;
    const day = iso.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  const assignedIds = useMemo(() => new Set(projects.map((row) => row.id)), [projects]);

  const rangedPayments = useMemo(
    () =>
      payments.filter((row) => {
        const projectId = row.projectId || row.project?.id;
        if (!projectId || !assignedIds.has(projectId)) return false;
        const kind = String(row.type || "").toUpperCase();
        if (kind && kind !== "FRANCHISEE_PAYOUT" && !kind.includes("FRANCHISEE")) {
          return false;
        }
        return inRange(row.paidDate || row.createdAt);
      }),
    [payments, from, to, assignedIds]
  );

  const byProject = useMemo(() => {
    const map = new Map<string, ProjectPay>();
    for (const project of projects) {
      map.set(project.id, {
        id: project.id,
        name: project.name,
        location: project.address || "",
        projectAmount: budgetOf(project),
        paid: 0,
        pending: 0,
        lastPaidAt: null,
      });
    }
    for (const row of rangedPayments) {
      const id = row.projectId || row.project?.id;
      if (!id || !map.has(id)) continue;
      const item = map.get(id)!;
      const paid = money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0);
      item.paid += paid;
      const at = row.paidDate || row.createdAt || null;
      if (at && (!item.lastPaidAt || at > item.lastPaidAt)) item.lastPaidAt = at;
    }
    return [...map.values()].map((item) => ({
      ...item,
      pending: Math.max(0, item.projectAmount - item.paid),
    }));
  }, [projects, rangedPayments]);

  const filteredProjects = useMemo(() => {
    return byProject.filter((row) => {
      if (statusFilter === "paid") return row.pending <= 0 && row.paid > 0;
      if (statusFilter === "partial") return row.paid > 0 && row.pending > 0;
      if (statusFilter === "unpaid") return row.paid <= 0;
      return true;
    });
  }, [byProject, statusFilter]);

  const totals = useMemo(() => {
    const projectAmount = byProject.reduce((sum, row) => sum + row.projectAmount, 0);
    const paid = byProject.reduce((sum, row) => sum + row.paid, 0);
    return {
      projects: byProject.length,
      projectAmount,
      paid,
      pending: Math.max(0, projectAmount - paid),
    };
  }, [byProject]);

  const projectPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice(
    (projectPage - 1) * PAGE_SIZE,
    projectPage * PAGE_SIZE
  );
  const txnRows = showAllTxn ? rangedPayments : rangedPayments.slice(0, 5);

  const downloadCsv = () => {
    const header = [
      "Project",
      "Transaction ID",
      "Amount",
      "Payment Date",
      "Paid By",
      "Payment Mode",
      "Remarks",
    ];
    const lines = rangedPayments.map((row) =>
      [
        row.project?.name || row.clientName || "",
        row.invoiceNo || codeFromId("PAY", row.id),
        money(row.paidAmount || row.amount),
        formatDate(row.paidDate || row.createdAt),
        row.createdBy?.name || "Santoshi Interior Pvt. Ltd.",
        methodLabel(row.method),
        row.remark || "",
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
    a.download = "franchisee-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const payStatus = (row: ProjectPay) => {
    if (row.paid > 0 && row.pending <= 0) return { label: "Paid", color: "success" as const };
    if (row.paid > 0) return { label: "Partially Paid", color: "warning" as const };
    return { label: "Unpaid", color: "error" as const };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span className="mx-1">›</span>
            <span className="text-gray-800 dark:text-white/90">Payments</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Payments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            These are payouts from Santoshi Interior to you for assigned projects — not customer collections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link href="/projects" className={card}>
          <p className="text-xs text-gray-500">Total Projects</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {loading ? "—" : totals.projects}
          </p>
          <p className="mt-2 text-xs font-medium text-brand-600">View Projects</p>
        </Link>
        <div className={card}>
          <p className="text-xs text-gray-500">Total Project Amount</p>
          <p className="mt-2 text-2xl font-semibold text-success-600">
            {formatINR(totals.projectAmount)}
          </p>
          <p className="mt-2 text-xs text-gray-400">View Details</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Total Paid by Company</p>
          <p className="mt-2 text-2xl font-semibold text-brand-500">
            {formatINR(totals.paid)}
          </p>
          <p className="mt-2 text-xs text-gray-400">View Details</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Pending Receivable</p>
          <p className="mt-2 text-2xl font-semibold text-warning-600">
            {formatINR(totals.pending)}
          </p>
          <p className="mt-2 text-xs text-gray-400">View Details</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Payment by Project
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
              <option value="all">All statuses</option>
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
                <th className="px-4 py-2">Project Amount (₹)</th>
                <th className="px-4 py-2">Total Paid by Company</th>
                <th className="px-4 py-2">Pending Amount (₹)</th>
                <th className="px-4 py-2">Last Payment Date</th>
                <th className="px-4 py-2">Status</th>
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
                      {row.location ? (
                        <p className="text-xs text-gray-400">{row.location}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{codeFromId("PROJ", row.id)}</td>
                    <td className="px-4 py-3">{formatAmount(row.projectAmount)}</td>
                    <td className="px-4 py-3 font-medium text-success-600">
                      {formatAmount(row.paid)}
                    </td>
                    <td className="px-4 py-3 font-medium text-error-500">
                      {row.pending ? formatAmount(row.pending) : "0"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.lastPaidAt ? formatDate(row.lastPaidAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {!loading && !pagedProjects.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No project payments yet.
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
            Payment Transactions
          </h2>
          <p className="text-xs text-gray-500">All payouts received from the company for your assigned projects.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Site / Project Name</th>
                <th className="px-4 py-2">Transaction ID</th>
                <th className="px-4 py-2">Amount (₹)</th>
                <th className="px-4 py-2">Payment Date</th>
                <th className="px-4 py-2">Paid By</th>
                <th className="px-4 py-2">Payment Mode</th>
                <th className="px-4 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {txnRows.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {row.project?.name || row.clientName || "—"}
                    </p>
                    {row.project?.address ? (
                      <p className="text-xs text-gray-400">{row.project.address}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.invoiceNo || codeFromId("PAY", row.id)}
                  </td>
                  <td className="px-4 py-3 font-medium text-success-600">
                    {formatAmount(money(row.paidAmount || row.amount))}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(row.paidDate || row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    Santoshi Interior Pvt. Ltd.
                  </td>
                  <td className="px-4 py-3 text-gray-600">{methodLabel(row.method)}</td>
                  <td className="px-4 py-3 text-gray-600">{row.remark || "—"}</td>
                </tr>
              ))}
              {!loading && !txnRows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No payment transactions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {rangedPayments.length > 5 ? (
          <div className="px-4 py-3">
            <Button size="sm" variant="outline" onClick={() => setShowAllTxn((v) => !v)}>
              {showAllTxn ? "Show less" : "View All Transactions"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
