"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import {
  formatCompactINR,
  formatShortDate,
  paymentFieldClass,
  paymentLabelClass,
  paymentSerif,
} from "@/components/payments/paymentMoney";
import { paymentsApi, projectsApi, usersApi } from "@/services/crmApi";
import type { AuthUser } from "@/lib/auth";
import { parseMoney, splitProjectValue } from "@/lib/dlpHolding";

type Kind = "FRANCHISEE_PAYOUT" | "DLP";

type AssigneeRow = { userId?: string; user?: { id?: string; name?: string } | null };

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
  storeId?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  assignees?: AssigneeRow[];
  budget?: string | null;
  dlpHoldingPercent?: number | string | null;
};

type PaymentRow = {
  id: string;
  invoiceNo?: string | null;
  type?: string | null;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  method?: string;
  remark?: string | null;
  paidDate?: string | null;
  createdAt?: string;
  projectId?: string | null;
  project?: { id: string; name: string; clientName?: string | null } | null;
  payee?: { id: string; name: string } | null;
  payeeUserId?: string | null;
};

const METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
];

function isFranchiseeAccount(user: { accessRole?: { key?: string; label?: string } | null }) {
  return (
    user.accessRole?.key === "FRANCHISEE" ||
    /franchisee/i.test(String(user.accessRole?.label || "")) ||
    /vendor panel/i.test(String(user.accessRole?.label || ""))
  );
}

function money(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function projectFranchiseeIds(project: ProjectRow) {
  return (project.assignees || [])
    .map((row) => row.userId || row.user?.id)
    .filter(Boolean) as string[];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function invoiceNo(kind: Kind) {
  const prefix = kind === "DLP" ? "DLP" : "FP";
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

function statusColor(status?: string) {
  const key = String(status || "").toUpperCase();
  if (key === "PAID") return "success" as const;
  if (key === "PARTIAL") return "warning" as const;
  if (key === "OVERDUE") return "error" as const;
  return "light" as const;
}

function methodLabel(method?: string) {
  return METHODS.find((item) => item.value === method)?.label || method || "—";
}

function paidOf(row: PaymentRow) {
  return money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0);
}

function initials(name?: string | null) {
  const parts = String(name || "V")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "V";
}

export default function AdminPayFranchisee() {
  const searchParams = useSearchParams();
  const initialKind = searchParams.get("type") === "dlp" ? "DLP" : "FRANCHISEE_PAYOUT";
  const [kind, setKind] = useState<Kind>(initialKind);
  const [franchisees, setFranchisees] = useState<AuthUser[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [payouts, setPayouts] = useState<PaymentRow[]>([]);
  const [dlpRows, setDlpRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<PaymentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    payeeUserId: "",
    projectId: "",
    holdingPercent: "20",
    amount: "",
    paidAmount: "",
    method: "UPI",
    paidDate: todayIso(),
    remark: "",
    markPaid: true,
  });

  const load = async (nextKind: Kind) => {
    setLoading(true);
    setError("");
    try {
      const [projectRes, payoutRes, dlpRes] = await Promise.all([
        projectsApi.list({ limit: 200 }),
        paymentsApi.list({ limit: 200, type: "FRANCHISEE_PAYOUT" }),
        paymentsApi.list({ limit: 200, type: "DLP" }),
      ]);
      let people: AuthUser[] = [];
      try {
        const usersRes = await usersApi.list({ limit: 200, isActive: "true" });
        people = (usersRes.items || []).filter((u) => isFranchiseeAccount(u));
      } catch {
        people = [];
      }
      const rows = (projectRes.items || []) as ProjectRow[];
      if (!people.length) {
        const seen = new Map<string, AuthUser>();
        for (const project of rows) {
          for (const row of project.assignees || []) {
            const user = row.user;
            if (!user?.id || seen.has(user.id)) continue;
            if (!isFranchiseeAccount(user as AuthUser)) continue;
            seen.set(user.id, {
              id: user.id,
              name: user.name || "Vendor",
              email: "",
              role: "STAFF",
            });
          }
        }
        people = [...seen.values()];
      }
      setFranchisees(people);
      setProjects(rows);
      const payoutItems = (payoutRes.items || []) as PaymentRow[];
      const dlpItems = (dlpRes.items || []) as PaymentRow[];
      setPayouts(payoutItems);
      setDlpRows(dlpItems);
      setPayments(nextKind === "DLP" ? dlpItems : payoutItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(kind);
  }, [kind]);

  const assignedProjects = useMemo(() => {
    if (!form.payeeUserId) return [];
    return projects.filter((project) =>
      projectFranchiseeIds(project).includes(form.payeeUserId)
    );
  }, [projects, form.payeeUserId]);

  const selectedSplit = useMemo(() => {
    const project = projects.find((row) => row.id === form.projectId);
    if (!project) return null;
    const split = splitProjectValue(
      parseMoney(project.budget),
      Number(form.holdingPercent)
    );
    const payoutPaid = payouts
      .filter(
        (row) =>
          row.id !== editingId &&
          (row.projectId || row.project?.id) === project.id &&
          (row.payeeUserId === form.payeeUserId || row.payee?.id === form.payeeUserId)
      )
      .reduce((sum, row) => sum + paidOf(row), 0);
    const dlpPaid = dlpRows
      .filter(
        (row) =>
          row.id !== editingId &&
          (row.projectId || row.project?.id) === project.id &&
          (row.payeeUserId === form.payeeUserId || row.payee?.id === form.payeeUserId)
      )
      .reduce((sum, row) => sum + paidOf(row), 0);
    return {
      ...split,
      payoutPaid,
      dlpPaid,
      payoutRemaining: Math.max(0, split.payable - payoutPaid),
      dlpRemaining: Math.max(0, split.dlp - dlpPaid),
    };
  }, [projects, form.projectId, form.holdingPercent, form.payeeUserId, payouts, dlpRows, editingId]);

  const totals = useMemo(() => {
    const amount = payments.reduce((sum, row) => sum + money(row.amount), 0);
    const paid = payments.reduce((sum, row) => sum + paidOf(row), 0);
    return { count: payments.length, amount, paid, pending: Math.max(0, amount - paid) };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((row) => {
      const status = String(row.status || "PENDING").toUpperCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return [row.invoiceNo, row.payee?.name, row.project?.name, row.project?.clientName, row.remark]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [payments, search, statusFilter]);

  const paidPct = totals.amount > 0 ? Math.round((totals.paid / totals.amount) * 100) : 0;

  const applyProject = (
    projectId: string,
    holdingPercent?: string,
    keepAmount = false
  ) => {
    const project = projects.find((row) => row.id === projectId);
    const pct =
      holdingPercent ??
      (project?.dlpHoldingPercent != null
        ? String(Number(project.dlpHoldingPercent))
        : form.holdingPercent || "20");
    const split = project
      ? splitProjectValue(parseMoney(project.budget), Number(pct))
      : null;
    const payoutPaid = payouts
      .filter(
        (row) =>
          row.id !== editingId &&
          (row.projectId || row.project?.id) === projectId &&
          (row.payeeUserId === form.payeeUserId || row.payee?.id === form.payeeUserId)
      )
      .reduce((sum, row) => sum + paidOf(row), 0);
    const dlpPaid = dlpRows
      .filter(
        (row) =>
          row.id !== editingId &&
          (row.projectId || row.project?.id) === projectId &&
          (row.payeeUserId === form.payeeUserId || row.payee?.id === form.payeeUserId)
      )
      .reduce((sum, row) => sum + paidOf(row), 0);
    const remaining =
      kind === "DLP"
        ? Math.max(0, (split?.dlp || 0) - dlpPaid)
        : Math.max(0, (split?.payable || 0) - payoutPaid);
    setForm((f) => ({
      ...f,
      projectId,
      holdingPercent: pct,
      amount: keepAmount ? f.amount : remaining ? String(remaining) : "",
    }));
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const openPay = () => {
    setEditingId(null);
    setForm({
      payeeUserId: franchisees[0]?.id || "",
      projectId: "",
      holdingPercent: "20",
      amount: "",
      paidAmount: "",
      method: "UPI",
      paidDate: todayIso(),
      remark: "",
      markPaid: true,
    });
    setFormOpen(true);
    setError("");
  };

  const openEdit = (row: PaymentRow) => {
    const projectId = row.projectId || row.project?.id || "";
    const project = projects.find((item) => item.id === projectId);
    const paid = paidOf(row);
    const amount = money(row.amount);
    setEditingId(row.id);
    setForm({
      payeeUserId: row.payeeUserId || row.payee?.id || "",
      projectId,
      holdingPercent:
        project?.dlpHoldingPercent != null
          ? String(Number(project.dlpHoldingPercent))
          : "20",
      amount: amount ? String(amount) : "",
      paidAmount: String(paid),
      method: row.method || "UPI",
      paidDate: String(row.paidDate || row.createdAt || todayIso()).slice(0, 10),
      remark: row.remark || "",
      markPaid: amount > 0 && paid >= amount,
    });
    setFormOpen(true);
    setError("");
  };

  const savePay = async () => {
    const amount = Number(form.amount) || 0;
    const paidAmount = form.markPaid
      ? amount
      : Math.min(amount, Number(form.paidAmount) || 0);
    if (!form.payeeUserId) {
      setError("Select the vendor to pay.");
      return;
    }
    if (!form.projectId) {
      setError("Select the assigned project.");
      return;
    }
    if (amount <= 0) {
      setError("Enter a payment amount.");
      return;
    }
    const cap = kind === "DLP" ? selectedSplit?.dlpRemaining : selectedSplit?.payoutRemaining;
    if (selectedSplit && cap !== undefined && amount > cap + 0.01) {
      setError(
        kind === "DLP"
          ? `DLP holding left on this project is ${formatINR(cap)}.`
          : `Vendor payment left after DLP holding is ${formatINR(cap)}.`
      );
      return;
    }
    const project = projects.find((row) => row.id === form.projectId);
    const payee = franchisees.find((row) => row.id === form.payeeUserId);
    setSaving(true);
    setError("");
    try {
      if (project?.id) {
        await projectsApi.update(project.id, {
          dlpHoldingPercent: Number(form.holdingPercent) || 0,
        });
      }
      const payload = {
        type: kind,
        projectId: form.projectId,
        storeId: project?.storeId || null,
        clientName: project?.clientName || payee?.name || null,
        payeeUserId: form.payeeUserId,
        amount,
        paidAmount,
        method: form.method,
        paidDate: paidAmount > 0 ? `${form.paidDate}T00:00:00.000Z` : null,
        dueDate: `${form.paidDate}T00:00:00.000Z`,
        status: paidAmount >= amount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING",
        remark: form.remark.trim() || null,
        dlpHoldingPercent: Number(form.holdingPercent) || 0,
      };
      if (editingId) {
        await paymentsApi.update(editingId, payload);
        setNotice(
          kind === "DLP" ? "DLP payment updated." : "Vendor payment updated."
        );
      } else {
        await paymentsApi.create({
          invoiceNo: invoiceNo(kind),
          ...payload,
        });
        setNotice(
          kind === "DLP"
            ? "DLP holding payment recorded. The vendor can see it under DLP Payment."
            : "Vendor payment recorded. DLP holding is kept separate under DLP Payment."
        );
      }
      closeForm();
      await load(kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (row: PaymentRow) => {
    try {
      await paymentsApi.update(row.id, {
        paidAmount: money(row.amount),
        status: "PAID",
        paidDate: `${todayIso()}T00:00:00.000Z`,
      });
      await load(kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark paid");
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    setError("");
    try {
      await paymentsApi.remove(deleteRow.id);
      setNotice(
        kind === "DLP" ? "DLP payment deleted." : "Vendor payment deleted."
      );
      setDeleteRow(null);
      await load(kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment");
      setDeleteRow(null);
    } finally {
      setDeleting(false);
    }
  };

  const isDlp = kind === "DLP";
  const title = isDlp ? "DLP holding" : "Vendor payouts";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Finance
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={paymentSerif}
          >
            Vendor Payment
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#8a7b68]">
            Pay vendors after DLP holding. Example: value 100 with 20% holding → ₹20 DLP, ₹80 payout.
          </p>
        </div>
        <button
          type="button"
          onClick={openPay}
          className="inline-flex h-11 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {isDlp ? "+ Record DLP" : "+ Vendor payment"}
        </button>
      </div>

      <div className="inline-flex rounded-xl border border-[#eadfcf] bg-[#fbf8f3] p-1 dark:border-[#3a342c] dark:bg-[#161411]">
        {(
          [
            { key: "FRANCHISEE_PAYOUT" as Kind, label: "Vendor payouts" },
            { key: "DLP" as Kind, label: "DLP holding" },
          ]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setKind(tab.key);
              setSearch("");
              setStatusFilter("all");
            }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
              kind === tab.key
                ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                : "text-[#8a7b68] hover:text-[#1c1610]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-[#d8e4d4] bg-[#f4f8f2] px-4 py-3 text-sm text-[#3d5a3a]">
          {notice}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] sm:grid-cols-4 sm:divide-y-0 dark:divide-[#3a342c]">
          {[
            { label: isDlp ? "DLP records" : "Payout records", value: loading ? "—" : String(totals.count) },
            {
              label: isDlp ? "DLP amount" : "Payable",
              value: loading ? "—" : formatCompactINR(totals.amount),
              accent: true,
            },
            {
              label: "Paid by company",
              value: loading ? "—" : formatCompactINR(totals.paid),
              olive: true,
            },
            {
              label: "Pending",
              value: loading ? "—" : formatCompactINR(totals.pending),
              rose: true,
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-4">
              <p
                className={`font-serif text-2xl ${
                  item.accent
                    ? "text-[#9a7748]"
                    : item.olive
                      ? "text-[#3d5a3a]"
                      : item.rose
                        ? "text-rose-700"
                        : "text-[#1c1610] dark:text-[#f3ece2]"
                }`}
                style={paymentSerif}
              >
                {item.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
          <div className="flex items-center justify-between text-[11px] text-[#8a7b68]">
            <span>Settlement</span>
            <span className="tabular-nums">{paidPct}% paid</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadfcf] dark:bg-[#3a342c]">
            <div
              className="h-full rounded-full bg-[#c4a574] transition-all"
              style={{ width: `${Math.max(paidPct ? 4 : 0, paidPct)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4a574]">
              {isDlp ? "Holding releases" : "Company to vendor"}
            </p>
            <h2
              className="mt-0.5 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
              style={paymentSerif}
            >
              {title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a594]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, project, ref"
                className={`${paymentFieldClass} h-10 w-56 pl-9`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${paymentFieldClass} h-10 w-[140px]`}
            >
              <option value="all">All status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((row) => {
                const pending = money(row.amount) - paidOf(row);
                const rowPct =
                  money(row.amount) > 0
                    ? Math.min(100, Math.round((paidOf(row) / money(row.amount)) * 100))
                    : 0;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-[#f0e8db] dark:border-[#3a342c]"
                  >
                    <td className="px-4 py-3 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {row.invoiceNo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c1610] text-[10px] font-semibold text-[#e8d5b5]">
                          {initials(row.payee?.name)}
                        </span>
                        <span className="text-[#1c1610] dark:text-[#f3ece2]">
                          {row.payee?.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {row.project?.name || "—"}
                      </p>
                      {row.project?.clientName ? (
                        <p className="text-xs text-[#8a7b68]">{row.project.clientName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-serif text-base text-[#1c1610]" style={paymentSerif}>
                        {formatINR(money(row.amount))}
                      </p>
                      <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-[#eadfcf]">
                        <div
                          className="h-full rounded-full bg-[#c4a574]"
                          style={{ width: `${rowPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#3d5a3a]">
                      {formatINR(paidOf(row))}
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">
                      {formatShortDate(row.paidDate || row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">{methodLabel(row.method)}</td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={statusColor(row.status)}>
                        {row.status || "PENDING"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9a7748] hover:text-[#1c1610]"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold uppercase tracking-[0.1em] text-rose-700 hover:text-rose-900"
                          onClick={() => setDeleteRow(row)}
                        >
                          Delete
                        </button>
                        {pending > 0 ? (
                          <button
                            type="button"
                            className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a7b68] hover:text-[#1c1610]"
                            onClick={() => void markPaid(row)}
                          >
                            Mark paid
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !filteredPayments.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <p className="font-serif text-lg text-[#1c1610]" style={paymentSerif}>
                      No {isDlp ? "DLP" : "vendor"} payments yet
                    </p>
                    <p className="mt-1 text-sm text-[#8a7b68]">
                      Record one to pay a vendor. Holding stays under DLP until released.
                    </p>
                    <button
                      type="button"
                      onClick={openPay}
                      className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
                    >
                      {isDlp ? "+ Record DLP" : "+ Vendor payment"}
                    </button>
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[#8a7b68]">
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        showCloseButton={false}
        className="max-w-lg overflow-hidden"
      >
        <div className="flex max-h-[min(88vh,720px)] flex-col">
          <div className="flex shrink-0 items-start justify-between border-b border-[#eadfcf] bg-[#fbf8f3] px-5 py-4 dark:border-[#3a342c] dark:bg-[#161411]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
                {editingId ? "Edit" : isDlp ? "Release holding" : "Payout"}
              </p>
              <h3
                className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
                style={paymentSerif}
              >
                {editingId
                  ? isDlp
                    ? "Edit DLP payment"
                    : "Edit vendor payment"
                  : isDlp
                    ? "Pay DLP to vendor"
                    : "Vendor payment"}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="mt-0.5 text-[#8a7b68] hover:text-[#1c1610]"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div>
              <label className={paymentLabelClass}>Vendor</label>
              <select
                value={form.payeeUserId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payeeUserId: e.target.value, projectId: "" }))
                }
                className={paymentFieldClass}
              >
                <option value="">Select vendor</option>
                {franchisees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                    {user.roleLabel ? ` · ${user.roleLabel}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={paymentLabelClass}>Assigned project</label>
              <select
                value={form.projectId}
                onChange={(e) => applyProject(e.target.value)}
                className={paymentFieldClass}
              >
                <option value="">Select project</option>
                {assignedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.clientName ? ` · ${project.clientName}` : ""}
                  </option>
                ))}
              </select>
              {form.payeeUserId && !assignedProjects.length ? (
                <p className="mt-1 text-xs text-rose-600">
                  This vendor has no assigned projects. Assign a project first.
                </p>
              ) : null}
            </div>
            {selectedSplit ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Project value", value: formatINR(selectedSplit.value) },
                  { label: "Holding", value: `${selectedSplit.percent}%` },
                  { label: "DLP held", value: formatINR(selectedSplit.dlp), tone: "gold" },
                  { label: "Vendor payable", value: formatINR(selectedSplit.payable), tone: "olive" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-2.5 dark:border-[#3a342c] dark:bg-[#161411]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
                      {item.label}
                    </p>
                    <p
                      className={`mt-1 font-serif text-base ${
                        item.tone === "gold"
                          ? "text-[#9a7748]"
                          : item.tone === "olive"
                            ? "text-[#3d5a3a]"
                            : "text-[#1c1610] dark:text-[#f3ece2]"
                      }`}
                      style={paymentSerif}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
                <p className="col-span-2 text-xs text-[#8a7b68]">
                  DLP pending {formatINR(selectedSplit.dlpRemaining)} · Payment pending{" "}
                  {formatINR(selectedSplit.payoutRemaining)}
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={paymentLabelClass}>DLP holding %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.holdingPercent}
                  onChange={(e) =>
                    applyProject(form.projectId, e.target.value, Boolean(editingId))
                  }
                  className={paymentFieldClass}
                />
              </div>
              <div>
                <label className={paymentLabelClass}>
                  {isDlp ? "DLP amount (₹)" : "Payment amount (₹)"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={paymentFieldClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={paymentLabelClass}>Payment date</label>
                <input
                  type="date"
                  value={form.paidDate}
                  onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
                  className={paymentFieldClass}
                />
              </div>
              <div>
                <label className={paymentLabelClass}>Method</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className={paymentFieldClass}
                >
                  {METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#5c5348]">
              <input
                type="checkbox"
                checked={form.markPaid}
                onChange={(e) => setForm((f) => ({ ...f, markPaid: e.target.checked }))}
                className="accent-[#c4a574]"
              />
              Mark as paid now (company has transferred the amount)
            </label>
            {!form.markPaid ? (
              <div>
                <label className={paymentLabelClass}>Paid now (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.paidAmount}
                  onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))}
                  className={paymentFieldClass}
                />
              </div>
            ) : null}
            <div>
              <label className={paymentLabelClass}>Remark</label>
              <input
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                className={paymentFieldClass}
                placeholder={isDlp ? "Release DLP holding" : "Work payout after DLP holding"}
              />
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-[#eadfcf] bg-[#fbf8f3] px-5 py-3 dark:border-[#3a342c] dark:bg-[#161411]">
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748] dark:border-[#3a342c] dark:bg-[#1a1714]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void savePay()}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-60 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? isDlp
                    ? "Update DLP payment"
                    : "Update payout"
                  : isDlp
                    ? "Save DLP payment"
                    : "Save payout"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteRow)}
        onClose={() => setDeleteRow(null)}
        showCloseButton={false}
        className="max-w-md overflow-hidden"
      >
        <div className="px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
            Delete
          </p>
          <h3
            className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
            style={paymentSerif}
          >
            Delete {isDlp ? "DLP" : "vendor"} payment?
          </h3>
          <p className="mt-2 text-sm text-[#8a7b68]">
            {deleteRow?.invoiceNo || "This record"} for{" "}
            {deleteRow?.payee?.name || "the vendor"}
            {deleteRow?.project?.name ? ` · ${deleteRow.project.name}` : ""} will be
            removed. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteRow(null)}
              className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7748]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="inline-flex h-10 items-center rounded-xl bg-rose-700 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
