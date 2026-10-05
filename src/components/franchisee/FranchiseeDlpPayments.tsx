"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { paymentsApi, projectsApi } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";
import { parseMoney, splitProjectValue } from "@/lib/dlpHolding";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  budget?: string | null;
  dlpHoldingPercent?: number | string | null;
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

function txnStatus(row: PaymentRow) {
  const key = String(row.status || "").toUpperCase();
  const amount = money(row.amount);
  const paid = money(row.paidAmount) || (key === "PAID" ? amount : 0);
  if (key === "PAID" || (amount > 0 && paid >= amount)) {
    return { label: "Paid", color: "success" as const };
  }
  if (key === "PARTIAL" || paid > 0) {
    return { label: "Partially Paid", color: "warning" as const };
  }
  if (key === "OVERDUE") return { label: "Overdue", color: "error" as const };
  return { label: "Unpaid", color: "error" as const };
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

const card = "vendor-card p-4";
const selectClass =
  "h-9 rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] px-2 text-sm text-[#111] dark:border-[var(--vendor-line)] dark:bg-black/20";

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
    const paidByProject = new Map<string, { paid: number; dlpDate: string | null }>();
    for (const row of dlpPayments) {
      const id = row.projectId || row.project?.id;
      if (!id) continue;
      const current = paidByProject.get(id) || { paid: 0, dlpDate: null };
      current.paid += money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0);
      const at = row.dueDate || row.paidDate || row.createdAt || null;
      if (at && (!current.dlpDate || at < current.dlpDate)) current.dlpDate = at;
      paidByProject.set(id, current);
    }

    const rows: ProjectDlp[] = [];
    for (const project of projects) {
      const split = splitProjectValue(
        parseMoney(project.budget),
        Number(project.dlpHoldingPercent ?? 20)
      );
      const paidInfo = paidByProject.get(project.id);
      const dlpAmount = split.dlp;
      if (dlpAmount <= 0 && !paidInfo) continue;
      const paid = paidInfo?.paid || 0;
      rows.push({
        id: project.id,
        name: project.name,
        customer: project.clientName || "",
        dlpAmount: dlpAmount || paid,
        paid,
        pending: Math.max(0, (dlpAmount || paid) - paid),
        dlpDate: paidInfo?.dlpDate || null,
      });
    }
    return rows;
  }, [projects, dlpPayments]);

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
      `Status: ${txnStatus(row).label}`,
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
    <div className="space-y-6">
      <div className="vendor-rise">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a7748]">Vendor panel</p>
        <h1 className="vendor-serif mt-2 text-3xl text-[#111] md:text-4xl">DLP Payment</h1>
        <div className="vendor-gold-rule mt-3" />
        <p className="mt-3 max-w-xl text-sm text-[#6b645b]">
          View DLP holding (retention) on your project value. Example: project 100 with 20% holding → ₹20 DLP, remaining ₹80 in Payments.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={`${card} vendor-rise`}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Total DLP Cases</p>
          <p className="vendor-serif mt-2 text-3xl text-[#111]">{loading ? "—" : totals.cases}</p>
          <p className="mt-2 text-xs font-medium text-[#9a7748]">View Details</p>
        </div>
        <div className={`${card} vendor-rise vendor-rise-delay-1`}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Total DLP Amount</p>
          <p className="vendor-serif mt-2 text-3xl text-warning-600">{formatINR(totals.dlpAmount)}</p>
          <p className="mt-2 text-xs text-[#8a8175]">View Details</p>
        </div>
        <div className={`${card} vendor-rise vendor-rise-delay-2`}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Total Paid by Company</p>
          <p className="vendor-serif mt-2 text-3xl text-success-600">{formatINR(totals.paid)}</p>
          <p className="mt-2 text-xs text-[#8a8175]">View Details</p>
        </div>
        <div className={`${card} vendor-rise vendor-rise-delay-3`}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Pending DLP Amount</p>
          <p className="vendor-serif mt-2 text-3xl text-error-500">{formatINR(totals.pending)}</p>
          <p className="mt-2 text-xs text-[#8a8175]">View Details</p>
        </div>
      </div>

      <div className="vendor-card vendor-rise overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Holding settlements</p>
            <h2 className="vendor-serif mt-1 text-2xl text-[#111]">DLP Summary by Project</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setProjectPage(1);
              }}
              className={selectClass}
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
            <thead className="bg-[#fbf8f2] text-left text-[11px] uppercase tracking-[0.12em] text-[#9a7748] dark:bg-white/[0.02]">
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
                  <tr key={row.id} className="border-t border-[#eee6d8] dark:border-[var(--vendor-line)]">
                    <td className="px-5 py-3 text-[#8a8175]">
                      {(projectPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111]">{row.name}</p>
                      {row.customer ? <p className="text-xs text-[#8a8175]">{row.customer}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">{codeFromId("PROJ", row.id)}</td>
                    <td className="px-4 py-3 vendor-serif text-lg text-[#111]">{formatAmount(row.dlpAmount)}</td>
                    <td className="px-4 py-3 font-medium text-success-600">{formatAmount(row.paid)}</td>
                    <td className="px-4 py-3 font-medium text-error-500">
                      {row.pending ? formatAmount(row.pending) : "0"}
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">
                      {row.dlpDate ? formatDate(row.dlpDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/projects" className="text-[#c4a574] hover:text-[#9a7748]">
                        ›
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && !pagedProjects.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[#8a8175]">
                    No DLP holding yet. Holding is a percent of the vendor project value, kept until DLP is released.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-sm text-[#8a8175]">
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
                    ? "bg-[#c4a574] text-black"
                    : "text-[#6b645b] hover:bg-[#f4efe6]"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="vendor-card vendor-rise overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Company settlements</p>
          <h2 className="vendor-serif mt-1 text-2xl text-[#111]">DLP Payment History</h2>
          <p className="mt-1 text-xs text-[#8a8175]">
            Payment transactions made by the company to release DLP holding.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fbf8f2] text-left text-[11px] uppercase tracking-[0.12em] text-[#9a7748] dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Sr. No.</th>
                <th className="px-4 py-2">Site / Project Name</th>
                <th className="px-4 py-2">Transaction ID</th>
                <th className="px-4 py-2">DLP Amount (₹)</th>
                <th className="px-4 py-2">Paid Amount (₹)</th>
                <th className="px-4 py-2">Payment Date</th>
                <th className="px-4 py-2">Payment Mode</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {txnRows.map((row, index) => (
                <tr key={row.id} className="border-t border-[#eee6d8] dark:border-[var(--vendor-line)]">
                  <td className="px-5 py-3 text-[#8a8175]">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#111]">{row.project?.name || "—"}</p>
                    <p className="text-xs text-[#8a8175]">{row.project?.clientName || row.clientName || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-[#6b645b]">{row.invoiceNo || codeFromId("DLP", row.id)}</td>
                  <td className="px-4 py-3 vendor-serif text-lg text-[#111]">{formatAmount(money(row.amount))}</td>
                  <td className="px-4 py-3 vendor-serif text-lg text-success-600">
                    {formatAmount(money(row.paidAmount))}
                  </td>
                  <td className="px-4 py-3 text-[#6b645b]">{formatDate(row.paidDate || row.createdAt)}</td>
                  <td className="px-4 py-3 text-[#6b645b]">{methodLabel(row.method)}</td>
                  <td className="px-4 py-3">
                    <Badge size="sm" color={txnStatus(row).color}>
                      {txnStatus(row).label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => downloadReceipt(row)}
                      className="text-[#9a7748] hover:text-[#c4a574]"
                      aria-label="Download receipt"
                    >
                      ↓
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !txnRows.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[#8a8175]">
                    No DLP settlements yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {dlpPayments.length > 5 ? (
          <div className="px-5 py-3">
            <Button size="sm" variant="outline" onClick={() => setShowAllTxn((v) => !v)}>
              {showAllTxn ? "Show less" : "View All Transactions"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="vendor-card px-5 py-4 text-sm text-[#6b645b]">
        DLP holding is a percent of the project value kept until the company releases it.
      </div>
    </div>
  );
}
