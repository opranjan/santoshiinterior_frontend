"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import AddExpenseModal from "@/components/payments/AddExpenseModal";
import AddFundModal from "@/components/payments/AddFundModal";
import {
  cashFlowPct,
  formatINRSigned,
  formatPct,
  formatShortDate,
  formatStamp,
  isExpenseType,
  isFundType,
  parseBudget,
  paymentSerif,
} from "@/components/payments/paymentMoney";
import { toastError } from "@/components/ui/toast/ToastHost";
import { paymentsApi, projectsApi } from "@/services/crmApi";

type PaymentRow = {
  id: string;
  invoiceNo?: string | null;
  type?: string;
  amount?: number | string;
  paidAmount?: number | string;
  paidDate?: string | null;
  createdAt?: string;
  remark?: string | null;
  vendorName?: string | null;
  category?: string | null;
  source?: string | null;
  expenseType?: string | null;
  contractName?: string | null;
  collectedBy?: string | null;
  createdBy?: { name?: string } | null;
  method?: string;
};

function SummaryChip({
  label,
  value,
  tone,
  kind = "money",
}: {
  label: string;
  value: number;
  tone?: "gold" | "rose" | "olive" | "ink";
  kind?: "money" | "pct";
}) {
  const color =
    tone === "rose"
      ? "text-rose-700"
      : tone === "olive"
        ? "text-[#3d5a3a]"
        : tone === "gold"
          ? "text-[#9a7748]"
          : "text-[#1c1610] dark:text-[#f3ece2]";
  return (
    <div className="min-w-[110px] px-3 py-2">
      <p className={`font-serif text-lg ${color}`} style={paymentSerif}>
        {kind === "pct" ? formatPct(value) : `\u20B9 ${formatINRSigned(value)}`}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">{label}</p>
    </div>
  );
}

export default function ProjectPayments({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<{
    id: string;
    name: string;
    clientName?: string | null;
    budget?: string | null;
  } | null>(null);
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expenses" | "funds">("expenses");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [showReversed, setShowReversed] = useState(false);

  const load = useCallback(async () => {
    const [projectRes, paymentRes] = await Promise.all([
      projectsApi.list({ limit: 200 }),
      paymentsApi.list({ limit: 200, projectId }),
    ]);
    const found = (projectRes.items || []).find((row) => String(row.id) === projectId) as
      | { id: string; name: string; clientName?: string; budget?: string }
      | undefined;
    setProject(found || { id: projectId, name: "Project" });
    setItems((paymentRes.items || []) as PaymentRow[]);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load project payments"))
      .finally(() => setLoading(false));
  }, [load]);

  const expenses = items.filter((row) => isExpenseType(row.type));
  const funds = items.filter((row) => isFundType(row.type));
  const visibleExpenses = showReversed
    ? expenses
    : expenses.filter((row) => Number(row.paidAmount || row.amount || 0) >= 0);

  const projectValue = parseBudget(project?.budget);
  const fundsReceived = funds.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
  const totalReceivables = projectValue - fundsReceived;
  const disbursed = expenses.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
  const estExpenses = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const receivableDues = -fundsReceived;
  const totalPayables = estExpenses - disbursed;
  const payablesDues = -disbursed;
  const cashFlow = fundsReceived - disbursed;
  const cashPct = cashFlowPct(cashFlow, projectValue, fundsReceived);
  const expectedPnl = projectValue - estExpenses;
  const label = `${project?.name || "Project"}${project?.clientName ? ` (${project.clientName})` : ""}`;

  const tabBtn = (active: boolean) =>
    `h-10 px-5 text-xs font-semibold uppercase tracking-[0.12em] ${
      active ? "bg-[#1c1610] text-[#e8d5b5]" : "bg-transparent text-[#8a7b68]"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/payments"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610]"
          >
            <span aria-hidden>{"\u2190"}</span>
            Payments dashboard
          </Link>
          <h1 className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]" style={paymentSerif}>
            Project payments
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">{label}</p>
        </div>
        <button
          type="button"
          onClick={() => (tab === "expenses" ? setExpenseOpen(true) : setFundOpen(true))}
          className="inline-flex h-11 w-fit items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
        >
          {tab === "expenses" ? "+ Add expense" : "+ Add fund"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">Financial summary</p>
        <div className="flex flex-wrap gap-1 overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
          <SummaryChip label="Project value" value={projectValue} />
          <SummaryChip label="Funds received" value={fundsReceived} tone="olive" />
          <SummaryChip label="Total receivables" value={totalReceivables} tone="gold" />
          <SummaryChip label="Disbursed amount" value={disbursed} tone="rose" />
          <SummaryChip label="Receivable dues" value={receivableDues} tone="rose" />
          <SummaryChip label="Total payables" value={totalPayables} />
          <SummaryChip label="Payables dues" value={payablesDues} tone="gold" />
          <SummaryChip label="Cash flow" value={cashFlow} tone={cashFlow < 0 ? "rose" : "olive"} />
          <SummaryChip label="Cash flow %" value={cashPct} kind="pct" tone={cashPct < 0 ? "rose" : "olive"} />
          <SummaryChip label="Expected P&L" value={expectedPnl} tone="olive" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
          <button type="button" onClick={() => setTab("expenses")} className={tabBtn(tab === "expenses")}>
            Expenses
          </button>
          <button type="button" onClick={() => setTab("funds")} className={tabBtn(tab === "funds")}>
            Funds
          </button>
        </div>
        <p className={`text-sm font-medium ${tab === "expenses" ? "text-[#9a7748]" : "text-[#3d5a3a]"}`}>
          {tab === "expenses"
            ? `Total expenses: \u20B9 ${formatINRSigned(estExpenses)}`
            : `Total funds: \u20B9 ${formatINRSigned(fundsReceived)}`}
        </p>
      </div>

      {tab === "expenses" ? (
        <label className="inline-flex items-center gap-2 text-sm text-[#6b645b]">
          <input type="checkbox" checked={showReversed} onChange={(e) => setShowReversed(e.target.checked)} />
          View reversed transactions
        </label>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          {tab === "expenses" ? (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                  {["ID", "Transaction date", "Recorded date", "Amount", "Expense by", "Vendor", "Contract", "Source", "Type", "Category"].map(
                    (heading) => (
                      <th key={heading} className="px-3 py-3.5">
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-[#8a7b68]">
                      Loading expenses...
                    </td>
                  </tr>
                ) : visibleExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-16 text-center">
                      <p className="font-serif text-xl text-[#1c1610]" style={paymentSerif}>
                        No expenses yet
                      </p>
                      <p className="mt-1 text-sm text-[#8a7b68]">Add material, labour, or vendor costs for this project.</p>
                    </td>
                  </tr>
                ) : (
                  visibleExpenses.map((row) => {
                    const amount = Number(row.paidAmount || row.amount || 0);
                    return (
                      <tr key={row.id} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                        <td className="px-3 py-3 font-semibold text-[#9a7748]">{row.invoiceNo || row.id.slice(0, 8)}</td>
                        <td className="px-3 py-3 text-[#6b645b]">{formatShortDate(row.paidDate || row.createdAt)}</td>
                        <td className="px-3 py-3 text-[#6b645b]">{formatStamp(row.createdAt)}</td>
                        <td className={`px-3 py-3 font-medium ${amount < 0 ? "text-rose-700" : "text-[#1c1610]"}`}>
                          {formatINRSigned(amount)}
                        </td>
                        <td className="px-3 py-3">{row.createdBy?.name || "Procurement"}</td>
                        <td className="px-3 py-3">{row.vendorName || "\u2014"}</td>
                        <td className="px-3 py-3">{row.contractName || "\u2014"}</td>
                        <td className="px-3 py-3">{row.source || "CompanyAccount"}</td>
                        <td className="px-3 py-3">{row.expenseType || "\u2014"}</td>
                        <td className="px-3 py-3">{row.category || "\u2014"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                  {["ID", "Collection date", "Recorded date", "Amount", "Collected by", "Mode", "Contract", "Remarks"].map((heading) => (
                    <th key={heading} className="px-3 py-3.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-[#8a7b68]">
                      Loading funds...
                    </td>
                  </tr>
                ) : funds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-16 text-center">
                      <p className="font-serif text-xl text-[#1c1610]" style={paymentSerif}>
                        No funds yet
                      </p>
                      <p className="mt-1 text-sm text-[#8a7b68]">Record collections received against this project.</p>
                    </td>
                  </tr>
                ) : (
                  funds.map((row) => (
                    <tr key={row.id} className="border-t border-[#f0e8db] dark:border-[#3a342c]">
                      <td className="px-3 py-3 font-semibold text-[#9a7748]">{row.invoiceNo || row.id.slice(0, 8)}</td>
                      <td className="px-3 py-3 text-[#6b645b]">{formatShortDate(row.paidDate || row.createdAt)}</td>
                      <td className="px-3 py-3 text-[#6b645b]">{formatStamp(row.createdAt)}</td>
                      <td className="px-3 py-3 font-medium text-[#3d5a3a]">
                        {formatINRSigned(Number(row.paidAmount || row.amount || 0))}
                      </td>
                      <td className="px-3 py-3">{row.collectedBy || row.createdBy?.name || "\u2014"}</td>
                      <td className="px-3 py-3">{row.method || "\u2014"}</td>
                      <td className="px-3 py-3">{row.contractName || "\u2014"}</td>
                      <td className="px-3 py-3 text-[#8a7b68]">{row.remark || "\u2014"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={() => void load()}
        projectId={projectId}
        projectLabel={label}
      />
      <AddFundModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        onCreated={() => void load()}
        projectId={projectId}
        projectLabel={label}
        clientName={project?.clientName || ""}
      />
    </div>
  );
}
