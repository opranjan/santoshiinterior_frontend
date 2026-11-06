"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { paymentsApi, projectsApi } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";
import { parseMoney, splitProjectValue } from "@/lib/dlpHolding";
import { downloadDlpReceiptPdf } from "@/lib/dlpReceiptPdf";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
  budget?: string | null;
  vendorBudget?: string | null;
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
    address?: string | null;
  } | null;
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
  location: string;
  vendorBudget: number;
  dlpPercent: number;
  dlpAmount: number;
  paid: number;
  pending: number;
  dlpDate: string | null;
  txnCount: number;
};

const selectClass =
  "h-10 rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] px-3 text-sm text-[#111] dark:border-[var(--vendor-line)] dark:bg-black/20";
const searchClass =
  "h-10 w-full min-w-[200px] rounded-lg border border-[#e4d9c8] bg-[#fbf8f2] pl-10 pr-3 text-sm text-[#111] outline-none focus:border-[#c4a574] dark:border-[var(--vendor-line)] dark:bg-black/20";

export default function FranchiseeDlpPayments() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyProjectId, setHistoryProjectId] = useState<string>("all");
  const [projectPage, setProjectPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 200, type: "DLP" }),
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
      payments
        .filter((row) => {
          const projectId = row.projectId || row.project?.id;
          if (!projectId || !assignedIds.has(projectId)) return false;
          return isDlp(row);
        })
        .sort(
          (a, b) =>
            new Date(b.paidDate || b.createdAt || 0).getTime() -
            new Date(a.paidDate || a.createdAt || 0).getTime()
        ),
    [payments, assignedIds]
  );

  const byProject = useMemo(() => {
    const paidByProject = new Map<
      string,
      { paid: number; dlpDate: string | null; txnCount: number }
    >();
    for (const row of dlpPayments) {
      const id = row.projectId || row.project?.id;
      if (!id) continue;
      const current = paidByProject.get(id) || { paid: 0, dlpDate: null, txnCount: 0 };
      current.paid += money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0);
      current.txnCount += 1;
      const at = row.dueDate || row.paidDate || row.createdAt || null;
      if (at && (!current.dlpDate || at < current.dlpDate)) current.dlpDate = at;
      paidByProject.set(id, current);
    }

    const rows: ProjectDlp[] = [];
    for (const project of projects) {
      const split = splitProjectValue(
        parseMoney(project.vendorBudget || project.budget),
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
        location: project.address || "",
        vendorBudget: split.value,
        dlpPercent: split.percent,
        dlpAmount: dlpAmount || paid,
        paid,
        pending: Math.max(0, (dlpAmount || paid) - paid),
        dlpDate: paidInfo?.dlpDate || null,
        txnCount: paidInfo?.txnCount || 0,
      });
    }
    return rows;
  }, [projects, dlpPayments]);

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
      return [row.name, row.customer, row.location, codeFromId("PROJ", row.id)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [byProject, statusFilter, search]);

  const totals = useMemo(() => {
    const dlpAmount = byProject.reduce((sum, row) => sum + row.dlpAmount, 0);
    const paid = byProject.reduce((sum, row) => sum + row.paid, 0);
    return {
      cases: byProject.length,
      dlpAmount,
      paid,
      pending: Math.max(0, dlpAmount - paid),
      pct: dlpAmount > 0 ? Math.min(100, Math.round((paid / dlpAmount) * 100)) : 0,
    };
  }, [byProject]);

  const projectPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice(
    (projectPage - 1) * PAGE_SIZE,
    projectPage * PAGE_SIZE
  );

  const historyRows = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return dlpPayments.filter((row) => {
      const projectId = row.projectId || row.project?.id || "";
      if (historyProjectId !== "all" && projectId !== historyProjectId) return false;
      const status = txnStatus(row).label.toLowerCase();
      if (historyStatus === "paid" && status !== "paid") return false;
      if (historyStatus === "partial" && status !== "partially paid") return false;
      if (historyStatus === "unpaid" && status !== "unpaid" && status !== "overdue") return false;
      if (!q) return true;
      return [
        row.invoiceNo,
        row.project?.name,
        row.project?.clientName,
        row.clientName,
        methodLabel(row.method),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [dlpPayments, historyProjectId, historyStatus, historySearch]);

  const payStatus = (row: ProjectDlp) => {
    if (row.paid > 0 && row.pending <= 0) return { label: "Paid" };
    if (row.paid > 0) return { label: "Partially Paid" };
    return { label: "Unpaid" };
  };

  const openProjectHistory = (projectId: string) => {
    setHistoryProjectId(projectId);
    setHistoryStatus("all");
    setHistorySearch("");
    if (typeof document !== "undefined") {
      document.getElementById("dlp-history")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const downloadCsv = () => {
    const header = [
      "Project",
      "Customer",
      "Project ID",
      "Vendor budget",
      "Hold %",
      "DLP held",
      "Received",
      "Pending",
      "DLP Date",
      "Status",
    ];
    const lines = filteredProjects.map((row) =>
      [
        row.name,
        row.customer,
        codeFromId("PROJ", row.id),
        row.vendorBudget,
        row.dlpPercent,
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
    const projectId = row.projectId || row.project?.id || "";
    void downloadDlpReceiptPdf({
      invoiceNo: row.invoiceNo || codeFromId("DLP", row.id),
      projectName: row.project?.name || "—",
      clientName: row.project?.clientName || row.clientName || "",
      projectCode: projectId ? codeFromId("PROJ", projectId) : "",
      amount: money(row.amount),
      paidAmount: money(row.paidAmount),
      method: methodLabel(row.method),
      status: txnStatus(row).label,
      paidDate: row.paidDate || row.createdAt || null,
      vendorName: user?.name || user?.roleLabel || "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="vendor-rise">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a7748]">Vendor panel</p>
          <h1 className="vendor-serif mt-2 text-2xl text-[#111] sm:text-3xl md:text-4xl">
            DLP Payment
          </h1>
          <div className="vendor-gold-rule mt-3" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b645b]">
            DLP holding is a percent of your vendor budget kept until release. Track held amounts by
            project and see when the company settles them.
          </p>
        </div>
        <Link
          href="/payments"
          className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] hover:border-[#c4a574] hover:text-[#1c1610]"
        >
          ← Payments
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[var(--vendor-line)] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-y-0 dark:divide-[var(--vendor-line)]">
          {[
            {
              label: "DLP projects",
              value: loading ? "—" : String(totals.cases),
              hint: "With holding",
            },
            {
              label: "DLP held",
              value: loading ? "—" : formatINR(totals.dlpAmount),
              hint: "Total holding",
              tone: "warn",
            },
            {
              label: "Received",
              value: loading ? "—" : formatINR(totals.paid),
              hint: "Released by company",
              tone: "received",
            },
            {
              label: "Still due",
              value: loading ? "—" : formatINR(totals.pending),
              hint: "Pending release",
              tone: "due",
            },
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
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`vendor-serif text-2xl ${
                    item.tone === "received"
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
          ))}
        </div>
        <div className="border-t border-[#eadfcf] px-4 py-3 dark:border-[var(--vendor-line)]">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#8a8175]">
            <span>DLP settlement</span>
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">
              Holding settlements
            </p>
            <h2 className="vendor-serif mt-1 text-2xl text-[#111]">DLP by project</h2>
            <p className="mt-1 text-sm text-[#8a8175]">
              Click <span className="font-medium text-[#6b645b]">History</span> to see DLP releases
              for that project.
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
                <th className="px-4 py-3">Hold %</th>
                <th className="px-4 py-3">DLP held</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedProjects.map((row) => {
                const status = payStatus(row);
                const pct =
                  row.dlpAmount > 0
                    ? Math.min(100, Math.round((row.paid / row.dlpAmount) * 100))
                    : row.paid > 0
                      ? 100
                      : 0;
                const statusStyles =
                  status.label === "Paid"
                    ? "bg-[#e7f6ec] text-[#1f7a3a] ring-[#b7e0c3]"
                    : status.label === "Partially Paid"
                      ? "bg-[#fff4e5] text-[#b86a16] ring-[#f0d4a8]"
                      : "bg-[#fdeceb] text-[#b42318] ring-[#f3c6c2]";
                const selected = historyProjectId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-[#eee6d8] transition dark:border-[var(--vendor-line)] ${
                      selected ? "bg-[#f7f1e6]" : "hover:bg-[#faf6ef]"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => openProjectHistory(row.id)}
                        className="group block text-left"
                      >
                        <p className="font-medium text-[#111] group-hover:text-[#9a7748]">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8a8175]">
                          {codeFromId("PROJ", row.id)}
                          {row.location ? ` · ${row.location}` : ""}
                          {row.customer ? ` · ${row.customer}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-[#8a8175]">
                          {row.txnCount} release{row.txnCount === 1 ? "" : "s"}
                          {row.dlpDate ? ` · since ${formatDate(row.dlpDate)}` : ""}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="vendor-serif text-base text-[#111]">
                        {formatAmount(row.vendorBudget)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">{row.dlpPercent}%</td>
                    <td className="px-4 py-3.5 vendor-serif text-base text-[#c45c2a]">
                      {formatAmount(row.dlpAmount)}
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
                      <button
                        type="button"
                        onClick={() => openProjectHistory(row.id)}
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
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !pagedProjects.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#8a8175]">
                    No DLP holding yet for your assigned projects.
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

      <div
        id="dlp-history"
        className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[var(--vendor-line)] dark:bg-[#161411]"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eadfcf] px-5 py-4 dark:border-[var(--vendor-line)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">
              Company settlements
            </p>
            <h2 className="vendor-serif mt-1 text-2xl text-[#111]">DLP payment history</h2>
            <p className="mt-1 text-sm text-[#8a8175]">
              Releases made by the company against DLP holding.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={historyProjectId}
              onChange={(e) => setHistoryProjectId(e.target.value)}
              className={selectClass}
            >
              <option value="all">All projects</option>
              {byProject.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
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
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search ref, project, mode"
                className={searchClass}
              />
            </div>
            <select
              value={historyStatus}
              onChange={(e) => setHistoryStatus(e.target.value)}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            {historyProjectId !== "all" ? (
              <Button size="sm" variant="outline" onClick={() => setHistoryProjectId("all")}>
                Show all
              </Button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fbf8f2] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a7748] dark:bg-white/[0.02]">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">DLP amount</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row, index) => {
                const status = txnStatus(row);
                const received = money(row.paidAmount);
                const isReceived = status.label === "Paid" || status.label === "Partially Paid";
                const statusStyles =
                  status.label === "Paid"
                    ? "bg-[#e7f6ec] text-[#1f7a3a] ring-[#b7e0c3]"
                    : status.label === "Partially Paid"
                      ? "bg-[#fff4e5] text-[#b86a16] ring-[#f0d4a8]"
                      : "bg-[#fdeceb] text-[#b42318] ring-[#f3c6c2]";
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-[#eee6d8] dark:border-[var(--vendor-line)] ${
                      status.label === "Paid"
                        ? "bg-[#f3faf5] hover:bg-[#eaf6ee]"
                        : "hover:bg-[#faf6ef]"
                    }`}
                  >
                    <td className="px-5 py-3.5 text-[#8a8175]">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[#111]">{row.project?.name || "—"}</p>
                      <p className="text-xs text-[#8a8175]">
                        {row.project?.clientName || row.clientName || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#111]">
                      {row.invoiceNo || codeFromId("DLP", row.id)}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">
                      {formatDate(row.paidDate || row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">{methodLabel(row.method)}</td>
                    <td className="px-4 py-3.5 vendor-serif text-base text-[#111]">
                      {formatAmount(money(row.amount))}
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className={`inline-flex min-w-[7rem] flex-col rounded-lg px-3 py-2 ${
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
                          {formatAmount(received)}
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
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ${statusStyles}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => downloadReceipt(row)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#c4a574] bg-[#fffaf2] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a6430] transition hover:border-[#1c1610] hover:bg-[#1c1610] hover:text-[#e8d5b5]"
                      >
                        Receipt
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
                            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !historyRows.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#8a8175]">
                    {dlpPayments.length
                      ? "No DLP settlements match your filters."
                      : "No DLP settlements yet."}
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
      </div>
    </div>
  );
}
