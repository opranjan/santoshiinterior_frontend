"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import { paymentsApi, projectsApi } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";
import { parseMoney, splitVendorPayout } from "@/lib/dlpHolding";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
  budget?: string | null;
  vendorBudget?: string | null;
  retentionAmount?: number | string | null;
  retentionPercent?: number;
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
  } | null;
  sourceExpenseId?: string | null;
};

function money(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function budgetOf(project?: { budget?: string | null; vendorBudget?: string | null } | null) {
  return parseMoney(project?.vendorBudget || project?.budget);
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

const searchClass =
  "h-10 w-full min-w-[200px] rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] pl-10 pr-3 text-sm text-[#111] outline-none focus:border-[#c4a574] dark:border-[var(--vendor-line)] dark:bg-black/20";
const selectClass =
  "h-10 rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] px-3 text-sm text-[#111] dark:border-[var(--vendor-line)] dark:bg-black/20";

export default function FranchiseePaymentHistory({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [projectRes, paymentRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 200 }),
        ]);
        if (cancelled) return;
        const rows = (projectRes.items || []) as ProjectRow[];
        const found = rows.find((row) => row.id === projectId) || null;
        setProject(found);
        const items = ((paymentRes.items || []) as PaymentRow[]).filter((row) => {
          const id = row.projectId || row.project?.id;
          if (id !== projectId) return false;
          const kind = String(row.type || "").toUpperCase();
          if (kind === "DLP") return false;
          if (
            kind &&
            kind !== "FRANCHISEE_PAYOUT" &&
            kind !== "VENDOR" &&
            !kind.includes("FRANCHISEE") &&
            !kind.includes("VENDOR")
          ) {
            return false;
          }
          return true;
        });
        items.sort(
          (a, b) =>
            new Date(b.paidDate || b.createdAt || 0).getTime() -
            new Date(a.paidDate || a.createdAt || 0).getTime()
        );
        setPayments(items);
      } catch (err) {
        if (!cancelled) {
          setProject(null);
          setPayments([]);
          setError(err instanceof Error ? err.message : "Failed to load payment history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const summary = useMemo(() => {
    const split = splitVendorPayout(
      budgetOf(project),
      Number(project?.dlpHoldingPercent ?? 20),
      Number(project?.retentionAmount || 0)
    );
    const paid = payments.reduce(
      (sum, row) =>
        sum + (money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0)),
      0
    );
    return {
      ...split,
      paid,
      pending: Math.max(0, split.payable - paid),
      pct:
        split.payable > 0
          ? Math.min(100, Math.round((paid / split.payable) * 100))
          : paid > 0
            ? 100
            : 0,
    };
  }, [project, payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((row) => {
      const status = txnStatus(row).label.toLowerCase();
      if (statusFilter === "paid" && status !== "paid") return false;
      if (statusFilter === "partial" && status !== "partially paid") return false;
      if (statusFilter === "unpaid" && status !== "unpaid" && status !== "overdue") return false;
      if (!q) return true;
      return [row.invoiceNo, row.remark, row.method, methodLabel(row.method)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [payments, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="vendor-rise">
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7748] hover:text-[#1c1610]"
        >
          ← Back to payments
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a7748]">
              Payment history
            </p>
            <h1 className="vendor-serif mt-2 text-2xl text-[#111] sm:text-3xl md:text-4xl">
              {project?.name || (loading ? "Loading…" : "Project")}
            </h1>
            <div className="vendor-gold-rule mt-3" />
            <p className="mt-3 text-sm leading-6 text-[#6b645b]">
              {project
                ? `${codeFromId("PROJ", project.id)}${
                    project.address ? ` · ${project.address}` : ""
                  }${project.clientName ? ` · ${project.clientName}` : ""}`
                : "Company payouts for this assigned project."}
            </p>
          </div>
          <Link
            href="/dlp-payment"
            className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] hover:border-[#c4a574] hover:text-[#1c1610]"
          >
            View DLP holding
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[var(--vendor-line)] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-y-0 dark:divide-[var(--vendor-line)]">
          {[
            { label: "Vendor budget", value: formatINR(summary.value) },
            { label: "Payable now", value: formatINR(summary.payable), tone: "payable" },
            { label: "Received", value: formatINR(summary.paid), tone: "received" },
            { label: "Still due", value: formatINR(summary.pending), tone: "due" },
          ].map((item) => (
            <div
              key={item.label}
              className={`px-4 py-4 ${
                item.tone === "received"
                  ? "bg-[#eef7f0] dark:bg-[#1a2a1c]"
                  : item.tone === "due"
                    ? "bg-[#fff6f0] dark:bg-[#2a1c16]"
                    : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <p
                  className={`vendor-serif text-2xl ${
                    item.tone === "payable"
                      ? "text-[#2f6b3a]"
                      : item.tone === "received"
                        ? "text-[#1f7a3a]"
                        : item.tone === "due"
                          ? "text-[#c45c2a]"
                          : "text-[#111]"
                  }`}
                >
                  {loading ? "—" : item.value}
                </p>
                {item.tone === "received" && !loading && summary.paid > 0 ? (
                  <span className="rounded-full bg-[#1f7a3a] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                    Received
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8175]">
                {item.label}
              </p>
              {item.tone === "received" ? (
                <p className="mt-1 text-xs text-[#3d5a3a]">Paid by company</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="border-t border-[#eadfcf] px-4 py-3 dark:border-[var(--vendor-line)]">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8a8175]">
            <span>
              Settlement · {payments.length} transaction{payments.length === 1 ? "" : "s"} · DLP{" "}
              {formatINR(summary.dlp)} ({summary.percent}%)
            </span>
            <span className="tabular-nums font-medium text-[#1f7a3a]">{summary.pct}% received</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#eadfcf] dark:bg-[#3a342c]">
            <div
              className="h-full rounded-full bg-[#2f9e57] transition-all"
              style={{ width: `${Math.max(summary.pct ? 4 : 0, summary.pct)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[var(--vendor-line)] dark:bg-[#161411]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eadfcf] px-5 py-4 dark:border-[var(--vendor-line)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Company payouts</p>
            <h2 className="vendor-serif mt-1 text-2xl text-[#111]">Transactions</h2>
            <p className="mt-1 text-sm text-[#8a8175]">Newest payments first for this project.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a594]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, mode, remark"
                className={searchClass}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fbf8f2] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a7748] dark:bg-white/[0.02]">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const status = txnStatus(row);
                const amount = money(row.paidAmount || row.amount);
                const isReceived = status.label === "Paid" || status.label === "Partially Paid";
                const fromExpense =
                  Boolean(row.sourceExpenseId) ||
                  /from project expense/i.test(String(row.remark || ""));
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-[#eee6d8] dark:border-[var(--vendor-line)] ${
                      status.label === "Paid"
                        ? "bg-[#f3faf5] hover:bg-[#eaf6ee]"
                        : status.label === "Partially Paid"
                          ? "bg-[#fffaf0] hover:bg-[#fff4e0]"
                          : "hover:bg-[#fbf8f2]/70"
                    }`}
                  >
                    <td className="px-5 py-3.5 text-[#8a8175]">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[#111]">
                        {row.invoiceNo || codeFromId("PAY", row.id)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#8a8175]">Santoshi Interior Pvt. Ltd.</p>
                      {fromExpense ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9a7748]">
                          From project expense
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">
                      {formatDate(row.paidDate || row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">{methodLabel(row.method)}</td>
                    <td className="px-4 py-3.5">
                      <div
                        className={`inline-flex min-w-[7.5rem] flex-col rounded-lg px-3 py-2 ${
                          isReceived
                            ? "bg-[#e7f6ec] ring-1 ring-[#b7e0c3]"
                            : "bg-[#f4efe6] ring-1 ring-[#eadfcf]"
                        }`}
                      >
                        <span
                          className={`vendor-serif text-lg leading-none ${
                            isReceived ? "text-[#1f7a3a]" : "text-[#8a7b68]"
                          }`}
                        >
                          {formatAmount(amount)}
                        </span>
                        <span
                          className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            isReceived ? "text-[#2f9e57]" : "text-[#8a8175]"
                          }`}
                        >
                          {status.label === "Paid"
                            ? "Received"
                            : status.label === "Partially Paid"
                              ? "Part received"
                              : "Not received"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge size="sm" color={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="max-w-[240px] px-4 py-3.5 text-[#6b645b]">
                      <p className="truncate" title={row.remark || undefined}>
                        {row.remark || "—"}
                      </p>
                    </td>
                  </tr>
                );
              })}
              {!loading && !filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#8a8175]">
                    {payments.length
                      ? "No transactions match your filters."
                      : "No payment transactions for this project yet."}
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#8a8175]">
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
