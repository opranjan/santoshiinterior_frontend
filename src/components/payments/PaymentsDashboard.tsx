"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  formatCompactINR,
  formatINRSigned,
  formatPct,
  cashFlowPct,
  isExpenseType,
  isFundType,
  parseBudget,
  paymentFieldClass,
  paymentSerif,
} from "@/components/payments/paymentMoney";
import { toastError } from "@/components/ui/toast/ToastHost";
import { paymentsApi, projectsApi } from "@/services/crmApi";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  budget?: string | null;
  status?: string | null;
};

type PaymentRow = {
  id: string;
  projectId?: string | null;
  type?: string;
  amount?: number | string;
  paidAmount?: number | string;
  project?: { id?: string; name?: string; clientName?: string; budget?: string } | null;
};

type LedgerRow = {
  id: string;
  clientName: string;
  projectName: string;
  projectValue: number;
  fundsReceived: number;
  totalReceivables: number;
  receivableDues: number;
  estExpenses: number;
  disbursed: number;
  totalPayables: number;
  payablesDues: number;
  cashFlow: number;
  cashFlowPct: number;
  expectedPnl: number;
};

function buildRows(projects: ProjectRow[], payments: PaymentRow[]): LedgerRow[] {
  const byProject = new Map<string, PaymentRow[]>();
  for (const payment of payments) {
    const id = payment.projectId || payment.project?.id;
    if (!id) continue;
    const list = byProject.get(id) || [];
    list.push(payment);
    byProject.set(id, list);
  }
  return projects.map((project) => {
    const rows = byProject.get(project.id) || [];
    const funds = rows.filter((row) => isFundType(row.type));
    const expenses = rows.filter((row) => isExpenseType(row.type));
    const projectValue = parseBudget(project.budget);
    const fundsReceived = funds.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
    const estExpenses = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const disbursed = expenses.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
    const totalReceivables = projectValue - fundsReceived;
    return {
      id: project.id,
      clientName: project.clientName || "\u2014",
      projectName: project.name,
      projectValue,
      fundsReceived,
      totalReceivables,
      receivableDues: -fundsReceived,
      estExpenses,
      disbursed,
      totalPayables: estExpenses - disbursed,
      payablesDues: -disbursed,
      cashFlow: fundsReceived - disbursed,
      cashFlowPct: cashFlowPct(fundsReceived - disbursed, projectValue, fundsReceived),
      expectedPnl: projectValue - estExpenses,
    };
  });
}

function Money({ value, tone }: { value: number; tone?: "rose" | "olive" | "muted" }) {
  const color =
    tone === "rose"
      ? "text-rose-700"
      : tone === "olive"
        ? "text-[#3d5a3a]"
        : "text-[#1c1610] dark:text-[#f3ece2]";
  return <span className={`tabular-nums ${color}`}>{formatINRSigned(value)}</span>;
}

export default function PaymentsDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([projectsApi.list({ limit: 200 }), paymentsApi.list({ limit: 200 })])
      .then(([projectRes, paymentRes]) => {
        setProjects((projectRes.items || []) as ProjectRow[]);
        setPayments((paymentRes.items || []) as PaymentRow[]);
      })
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load payments"))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => buildRows(projects, payments), [projects, payments]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.clientName.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => ({
        projects: acc.projects + 1,
        projectValue: acc.projectValue + row.projectValue,
        expectedPnl: acc.expectedPnl + row.expectedPnl,
        receivables: acc.receivables + Math.max(row.totalReceivables, 0),
        fundsReceived: acc.fundsReceived + row.fundsReceived,
        receivableDues: acc.receivableDues + row.receivableDues,
        estExpenses: acc.estExpenses + row.estExpenses,
        disbursed: acc.disbursed + row.disbursed,
        payables: acc.payables + row.totalPayables,
        cashFlow: acc.cashFlow + row.cashFlow,
      }),
      {
        projects: 0,
        projectValue: 0,
        expectedPnl: 0,
        receivables: 0,
        fundsReceived: 0,
        receivableDues: 0,
        estExpenses: 0,
        disbursed: 0,
        payables: 0,
        cashFlow: 0,
      }
    );
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">Finance</p>
          <h1 className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]" style={paymentSerif}>
            Payments dashboard
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">Project collections, expenses, and cash flow.</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-y-0 dark:divide-[#3a342c]">
            {[
              { label: "Total projects", value: loading ? "\u2014" : String(totals.projects) },
              { label: "Expected P&L", value: loading ? "\u2014" : formatCompactINR(totals.expectedPnl), accent: true },
              { label: "Project value", value: loading ? "\u2014" : formatCompactINR(totals.projectValue) },
              {
                label: "Cash flow %",
                value: loading
                  ? "\u2014"
                  : formatPct(cashFlowPct(totals.cashFlow, totals.projectValue, totals.fundsReceived)),
                accent: true,
              },
            ].map((item) => (
              <div key={item.label} className="px-4 py-4">
                <p
                  className={`font-serif text-2xl ${item.accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
                  style={paymentSerif}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="flex items-center justify-between border-b border-[#eadfcf] px-4 py-2 dark:border-[#3a342c]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Inflow</p>
            <span className="rounded-full bg-[#eadfcf] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5c472c]">
              Inflow
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#eadfcf] px-2 py-3 text-center dark:divide-[#3a342c]">
            <div>
              <p className="font-serif text-lg text-[#1c1610]" style={paymentSerif}>
                {formatCompactINR(totals.receivables)}
              </p>
              <p className="text-[10px] text-[#8a7b68]">Total receivables</p>
            </div>
            <div>
              <p className="font-serif text-lg text-[#3d5a3a]" style={paymentSerif}>
                {formatCompactINR(totals.fundsReceived)}
              </p>
              <p className="text-[10px] text-[#8a7b68]">Funds received</p>
            </div>
            <div>
              <p className="font-serif text-lg text-rose-700" style={paymentSerif}>
                {formatCompactINR(totals.receivableDues)}
              </p>
              <p className="text-[10px] text-[#8a7b68]">Receivable dues</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="flex items-center justify-between border-b border-[#eadfcf] px-4 py-2 dark:border-[#3a342c]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Outflow</p>
            <span className="rounded-full bg-[#f3e6c8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d6139]">
              Outflow
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#eadfcf] px-2 py-3 text-center dark:divide-[#3a342c]">
            <div>
              <p className="font-serif text-lg text-rose-700" style={paymentSerif}>
                {formatCompactINR(totals.estExpenses)}
              </p>
              <p className="text-[10px] text-[#8a7b68]">Est expenses</p>
            </div>
            <div>
              <p className="font-serif text-lg text-[#1c1610]" style={paymentSerif}>
                {formatCompactINR(totals.disbursed)}
              </p>
              <p className="text-[10px] text-[#8a7b68]">Disbursed</p>
            </div>
            <div>
              <p className="font-serif text-lg text-[#9a7748]" style={paymentSerif}>
                {formatCompactINR(totals.payables)}
              </p>
              <p className="text-[10px] text-[#8a7b68]">Payables</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or project"
            className={`${paymentFieldClass} pl-10`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                {[
                  "Client name",
                  "Project name",
                  "Project value",
                  "Funds received",
                  "Total receivables",
                  "Receivable dues",
                  "Estimated expenses",
                  "Disbursed amount",
                  "Total payables",
                  "Payables dues",
                  "Cash flow",
                  "Cash flow %",
                ].map((heading) => (
                  <th key={heading} className="px-3 py-3.5 whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                    <td colSpan={12} className="px-3 py-12 text-center text-[#8a7b68]">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                    <td colSpan={12} className="px-3 py-16 text-center">
                    <p className="font-serif text-xl text-[#1c1610]" style={paymentSerif}>
                      No projects yet
                    </p>
                    <p className="mt-1 text-sm text-[#8a7b68]">Create a project, then add funds and expenses.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/payments/${row.id}`)}
                    className={`cursor-pointer border-t border-[#f0e8db] hover:bg-[#fbf8f3] dark:border-[#3a342c] ${
                      row.cashFlow < 0 ? "bg-[#fbf4f2]" : "bg-[#f7f8f3]"
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-[#1c1610]">{row.clientName}</td>
                    <td className="px-3 py-3 font-semibold text-[#9a7748]">{row.projectName}</td>
                    <td className="px-3 py-3">
                      <Money value={row.projectValue} />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.fundsReceived} tone="olive" />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.totalReceivables} tone={row.totalReceivables < 0 ? "rose" : undefined} />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.receivableDues} tone="rose" />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.estExpenses} />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.disbursed} tone="rose" />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.totalPayables} tone={row.totalPayables < 0 ? "rose" : undefined} />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.payablesDues} tone="rose" />
                    </td>
                    <td className="px-3 py-3">
                      <Money value={row.cashFlow} tone={row.cashFlow < 0 ? "rose" : "olive"} />
                    </td>
                    <td className={`px-3 py-3 font-medium ${row.cashFlowPct < 0 ? "text-rose-700" : "text-[#3d5a3a]"}`}>
                      {formatPct(row.cashFlowPct)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#eadfcf] px-4 py-3 text-xs text-[#8a7b68] dark:border-[#3a342c]">
          {filtered.length} project{filtered.length === 1 ? "" : "s"} · click a row for expenses and funds
        </p>
      </div>
    </div>
  );
}
