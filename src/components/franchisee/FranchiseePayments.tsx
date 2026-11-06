"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import { paymentsApi, projectsApi } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";
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
  createdBy?: { id: string; name: string } | null;
};

const PAGE_SIZE = 8;

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

function budgetOf(project?: { budget?: string | null; vendorBudget?: string | null } | null) {
  return parseMoney(project?.vendorBudget || project?.budget);
}

function codeFromId(prefix: string, id: string) {
  const digits = id.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `${prefix}-${digits}`;
}

function projectPayStatus(row: ProjectPay) {
  if (row.paid > 0 && row.pending <= 0) return { label: "Paid", color: "success" as const };
  if (row.paid > 0) return { label: "Partially Paid", color: "warning" as const };
  return { label: "Unpaid", color: "error" as const };
}

type ProjectPay = {
  id: string;
  name: string;
  location: string;
  clientName: string;
  vendorBudget: number;
  dlpPercent: number;
  dlpHold: number;
  retention: number;
  retentionPercent: number;
  payable: number;
  paid: number;
  pending: number;
  lastPaidAt: string | null;
  txnCount: number;
};

const dateClass =
  "h-10 w-full min-w-0 rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] px-3 text-sm text-[#111] sm:w-auto dark:border-[var(--vendor-line)] dark:bg-black/20";
const selectClass =
  "h-10 rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] px-3 text-sm text-[#111] dark:border-[var(--vendor-line)] dark:bg-black/20";
const searchClass =
  "h-10 w-full min-w-[200px] rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] pl-10 pr-3 text-sm text-[#111] outline-none focus:border-[#c4a574] dark:border-[var(--vendor-line)] dark:bg-black/20";

export default function FranchiseePayments() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 100 }),
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
        return inRange(row.paidDate || row.createdAt);
      }),
    [payments, from, to, assignedIds]
  );

  const byProject = useMemo(() => {
    const map = new Map<string, ProjectPay>();
    for (const project of projects) {
      const split = splitVendorPayout(
        budgetOf(project),
        Number(project.dlpHoldingPercent ?? 20),
        Number(project.retentionAmount || 0)
      );
      map.set(project.id, {
        id: project.id,
        name: project.name,
        location: project.address || "",
        clientName: project.clientName || "",
        vendorBudget: split.value,
        dlpPercent: split.percent,
        dlpHold: split.dlp,
        retention: split.retention,
        retentionPercent: Number(project.retentionPercent || 0),
        payable: split.payable,
        paid: 0,
        pending: 0,
        lastPaidAt: null,
        txnCount: 0,
      });
    }
    for (const row of rangedPayments) {
      const id = row.projectId || row.project?.id;
      if (!id || !map.has(id)) continue;
      const item = map.get(id)!;
      const paid = money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0);
      item.paid += paid;
      item.txnCount += 1;
      const at = row.paidDate || row.createdAt || null;
      if (at && (!item.lastPaidAt || at > item.lastPaidAt)) item.lastPaidAt = at;
    }
    return [...map.values()].map((item) => ({
      ...item,
      pending: Math.max(0, item.payable - item.paid),
    }));
  }, [projects, rangedPayments]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return byProject.filter((row) => {
      if (statusFilter === "paid") {
        if (!(row.pending <= 0 && row.paid > 0)) return false;
      } else if (statusFilter === "partial") {
        if (!(row.paid > 0 && row.pending > 0)) return false;
      } else if (statusFilter === "unpaid") {
        if (!(row.paid <= 0)) return false;
      }
      if (!q) return true;
      return [row.name, row.location, row.clientName, codeFromId("PROJ", row.id)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [byProject, statusFilter, search]);

  const totals = useMemo(() => {
    const vendorBudget = byProject.reduce((sum, row) => sum + row.vendorBudget, 0);
    const dlpHold = byProject.reduce((sum, row) => sum + row.dlpHold, 0);
    const payable = byProject.reduce((sum, row) => sum + row.payable, 0);
    const paid = byProject.reduce((sum, row) => sum + row.paid, 0);
    return {
      projects: byProject.length,
      vendorBudget,
      dlpHold,
      payable,
      paid,
      pending: Math.max(0, payable - paid),
      pct: payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 0,
    };
  }, [byProject]);

  const projectPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice(
    (projectPage - 1) * PAGE_SIZE,
    projectPage * PAGE_SIZE
  );

  const downloadCsv = () => {
    const header = [
      "Project",
      "Vendor budget",
      "DLP hold %",
      "DLP hold",
      "Payable now",
      "Paid",
      "Pending",
      "Status",
    ];
    const summaryLines = filteredProjects.map((row) =>
      [
        row.name,
        row.vendorBudget,
        row.dlpPercent,
        row.dlpHold,
        row.payable,
        row.paid,
        row.pending,
        projectPayStatus(row).label,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...summaryLines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor-payments-by-project.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="vendor-rise">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a7748]">Vendor panel</p>
          <h1 className="vendor-serif mt-2 text-2xl text-[#111] sm:text-3xl md:text-4xl">
            Payments
          </h1>
          <div className="vendor-gold-rule mt-3" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b645b]">
            Track payable amounts by project. Open any row to see that project’s full payment
            history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={dateClass}
            aria-label="From date"
          />
          <span className="text-[#c4a574]">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={dateClass}
            aria-label="To date"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[var(--vendor-line)] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0 dark:divide-[var(--vendor-line)]">
          {[
            {
              label: "Vendor budget",
              value: loading ? "—" : formatINR(totals.vendorBudget),
              hint: `${totals.projects} project${totals.projects === 1 ? "" : "s"}`,
            },
            {
              label: "DLP holding",
              value: loading ? "—" : formatINR(totals.dlpHold),
              hint: "Held until DLP",
              href: "/dlp-payment",
              tone: "warn",
            },
            {
              label: "Payable now",
              value: loading ? "—" : formatINR(totals.payable),
              hint: "After DLP hold",
              tone: "success",
            },
            {
              label: "Received",
              value: loading ? "—" : formatINR(totals.paid),
              hint: "Paid by company",
              tone: "received",
            },
            {
              label: "Still due",
              value: loading ? "—" : formatINR(totals.pending),
              hint: "Pending receivable",
              tone: "due",
            },
          ].map((item) => {
            const body = (
              <div
                className={`px-4 py-4 ${
                  item.tone === "received"
                    ? "bg-[#eef7f0] dark:bg-[#1a2a1c]"
                    : item.tone === "due"
                      ? "bg-[#fff6f0] dark:bg-[#2a1c16]"
                      : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`vendor-serif text-2xl ${
                      item.tone === "success"
                        ? "text-[#2f6b3a]"
                        : item.tone === "received"
                          ? "text-[#1f7a3a]"
                          : item.tone === "due" || item.tone === "warn"
                            ? "text-[#c45c2a]"
                            : "text-[#111]"
                    }`}
                  >
                    {item.value}
                  </p>
                  {item.tone === "received" && !loading && totals.paid > 0 ? (
                    <span className="rounded-full bg-[#1f7a3a] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                      Received
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8175]">
                  {item.label}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    item.tone === "received" ? "text-[#3d5a3a]" : "text-[#8a8175]"
                  }`}
                >
                  {item.hint}
                </p>
              </div>
            );
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="transition hover:bg-[#f4efe6] dark:hover:bg-white/[0.03]"
              >
                {body}
              </Link>
            ) : (
              <div key={item.label}>{body}</div>
            );
          })}
        </div>
        <div className="border-t border-[#eadfcf] px-4 py-3 dark:border-[var(--vendor-line)]">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#8a8175]">
            <span>Overall settlement</span>
            <span className="tabular-nums font-medium text-[#1f7a3a]">{totals.pct}% received</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#eadfcf] dark:bg-[#3a342c]">
            <div
              className="h-full rounded-full bg-[#2f9e57] transition-all"
              style={{ width: `${Math.max(totals.pct ? 4 : 0, totals.pct)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[var(--vendor-line)] dark:bg-[#161411]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eadfcf] px-5 py-4 dark:border-[var(--vendor-line)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Assigned payouts</p>
            <h2 className="vendor-serif mt-1 text-2xl text-[#111]">Payment by project</h2>
            <p className="mt-1 text-sm text-[#8a8175]">
              Click <span className="font-medium text-[#6b645b]">History</span> to open payouts for
              that project.
            </p>
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setProjectPage(1);
                }}
                placeholder="Search project"
                className={searchClass}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setProjectPage(1);
              }}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              Download
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fbf8f2] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a7748] dark:bg-white/[0.02]">
              <tr>
                <th className="px-5 py-3">Project</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">DLP</th>
                <th className="px-4 py-3">Payable</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedProjects.map((row) => {
                const status = projectPayStatus(row);
                const pct =
                  row.payable > 0
                    ? Math.min(100, Math.round((row.paid / row.payable) * 100))
                    : row.paid > 0
                      ? 100
                      : 0;
                const statusStyles =
                  status.label === "Paid"
                    ? "bg-[#e7f6ec] text-[#1f7a3a] ring-[#b7e0c3]"
                    : status.label === "Partially Paid"
                      ? "bg-[#fff4e5] text-[#b86a16] ring-[#f0d4a8]"
                      : "bg-[#fdeceb] text-[#b42318] ring-[#f3c6c2]";
                return (
                  <tr
                    key={row.id}
                    className="border-t border-[#eee6d8] transition hover:bg-[#faf6ef] dark:border-[var(--vendor-line)]"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/payments/${row.id}`} className="group block">
                        <p className="font-medium text-[#111] group-hover:text-[#9a7748]">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8a8175]">
                          {codeFromId("PROJ", row.id)}
                          {row.location ? ` · ${row.location}` : ""}
                          {row.clientName ? ` · ${row.clientName}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-[#8a8175]">
                          {row.txnCount} payment{row.txnCount === 1 ? "" : "s"}
                          {row.lastPaidAt ? ` · last ${formatDate(row.lastPaidAt)}` : ""}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="vendor-serif text-base text-[#111]">
                        {formatAmount(row.vendorBudget)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">
                      <p className="font-medium text-[#111]">{formatAmount(row.dlpHold)}</p>
                      <p className="text-[11px] text-[#8a8175]">{row.dlpPercent}% held</p>
                    </td>
                    <td className="px-4 py-3.5 vendor-serif text-base text-[#2f6b3a]">
                      {formatAmount(row.payable)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex min-w-[5.5rem] flex-col rounded-lg bg-[#e7f6ec] px-2.5 py-1.5 ring-1 ring-[#b7e0c3]">
                        <span className="vendor-serif text-base leading-none text-[#1f7a3a]">
                          {formatAmount(row.paid)}
                        </span>
                        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2f9e57]">
                          {row.paid > 0 ? "Received" : "None yet"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className={`inline-flex min-w-[5.5rem] flex-col rounded-lg px-2.5 py-1.5 ring-1 ${
                          row.pending > 0
                            ? "bg-[#fff1e8] ring-[#f0cbb0]"
                            : "bg-[#f4efe6] ring-[#eadfcf]"
                        }`}
                      >
                        <span
                          className={`vendor-serif text-base leading-none ${
                            row.pending > 0 ? "text-[#c45c2a]" : "text-[#8a8175]"
                          }`}
                        >
                          {row.pending ? formatAmount(row.pending) : "0"}
                        </span>
                        <span
                          className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                            row.pending > 0 ? "text-[#d9773a]" : "text-[#8a8175]"
                          }`}
                        >
                          {row.pending > 0 ? "Due" : "Cleared"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-32">
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-[#1f7a3a]">{pct}%</span>
                          <span className="text-[#8a8175]">{100 - pct}% due</span>
                        </div>
                        <div className="flex h-2 overflow-hidden rounded-full bg-[#eadfcf]">
                          <div
                            className="h-full bg-[#2f9e57] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                          <div
                            className="h-full bg-[#f0a060]/80 transition-all"
                            style={{ width: `${Math.max(0, 100 - pct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ${statusStyles}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/payments/${row.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#c4a574] bg-[#fffaf2] px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a6430] shadow-sm transition hover:border-[#1c1610] hover:bg-[#1c1610] hover:text-[#e8d5b5]"
                      >
                        History
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && !pagedProjects.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#8a8175]">
                    No projects match your filters.
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#8a8175]">
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#eadfcf] px-5 py-3 text-sm text-[#8a8175] dark:border-[var(--vendor-line)]">
          <p>
            Showing {filteredProjects.length ? (projectPage - 1) * PAGE_SIZE + 1 : 0} to{" "}
            {Math.min(projectPage * PAGE_SIZE, filteredProjects.length)} of{" "}
            {filteredProjects.length}
          </p>
          {projectPages > 1 ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
