"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { paymentsApi, projectsApi, usersApi } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";
import type { AuthUser } from "@/lib/auth";

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

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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
    /franchisee/i.test(String(user.accessRole?.label || ""))
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

export default function AdminPayFranchisee() {
  const searchParams = useSearchParams();
  const initialKind = searchParams.get("type") === "dlp" ? "DLP" : "FRANCHISEE_PAYOUT";
  const [kind, setKind] = useState<Kind>(initialKind);
  const [franchisees, setFranchisees] = useState<AuthUser[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    payeeUserId: "",
    projectId: "",
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
      const [projectRes, paymentRes] = await Promise.all([
        projectsApi.list({ limit: 200 }),
        paymentsApi.list({ limit: 200, type: nextKind }),
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
              name: user.name || "Franchisee",
              email: "",
              role: "STAFF",
            });
          }
        }
        people = [...seen.values()];
      }
      setFranchisees(people);
      setProjects(rows);
      setPayments((paymentRes.items || []) as PaymentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load franchisee payments");
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

  const totals = useMemo(() => {
    const amount = payments.reduce((sum, row) => sum + money(row.amount), 0);
    const paid = payments.reduce(
      (sum, row) =>
        sum + (money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0)),
      0
    );
    return { count: payments.length, amount, paid, pending: Math.max(0, amount - paid) };
  }, [payments]);

  const openPay = () => {
    setForm({
      payeeUserId: franchisees[0]?.id || "",
      projectId: "",
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

  const savePay = async () => {
    const amount = Number(form.amount) || 0;
    const paidAmount = form.markPaid
      ? amount
      : Math.min(amount, Number(form.paidAmount) || 0);
    if (!form.payeeUserId) {
      setError("Select the franchisee to pay.");
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
    const project = projects.find((row) => row.id === form.projectId);
    const payee = franchisees.find((row) => row.id === form.payeeUserId);
    setSaving(true);
    setError("");
    try {
      await paymentsApi.create({
        invoiceNo: invoiceNo(kind),
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
      });
      setNotice(
        kind === "DLP"
          ? "DLP payment recorded. The franchisee can see it under DLP Payment."
          : "Franchisee payment recorded. The franchisee can see it under Payments."
      );
      setFormOpen(false);
      await load(kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
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

  const title = kind === "DLP" ? "DLP Payments" : "Franchisee Payments";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Pay Franchisee
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Company payouts to franchisees for assigned work. This is separate from customer collections in Payments.
          </p>
        </div>
        <Button size="sm" onClick={openPay}>
          {kind === "DLP" ? "+ Record DLP Payment" : "+ Pay Franchisee"}
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind("FRANCHISEE_PAYOUT")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            kind === "FRANCHISEE_PAYOUT"
              ? "bg-brand-600 text-white"
              : "border border-gray-200 text-gray-600 dark:border-gray-700"
          }`}
        >
          Franchisee Payments
        </button>
        <button
          type="button"
          onClick={() => setKind("DLP")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            kind === "DLP"
              ? "bg-brand-600 text-white"
              : "border border-gray-200 text-gray-600 dark:border-gray-700"
          }`}
        >
          DLP Payments
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-gray-500">Records</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {totals.count}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Total amount</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {formatINR(totals.amount)}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Paid by company</p>
          <p className="mt-2 text-2xl font-semibold text-success-600">
            {formatINR(totals.paid)}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-warning-600">
            {formatINR(totals.pending)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Ref</th>
                <th className="px-4 py-2">Franchisee</th>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => {
                const pending = money(row.amount) - money(row.paidAmount);
                return (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {row.invoiceNo || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.payee?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 dark:text-white/90">{row.project?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.project?.clientName || ""}</p>
                    </td>
                    <td className="px-4 py-3">{formatINR(money(row.amount))}</td>
                    <td className="px-4 py-3 text-success-600">{formatINR(money(row.paidAmount))}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(row.paidDate || row.createdAt || "")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={statusColor(row.status)}>
                        {row.status || "PENDING"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {pending > 0 ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-brand-600"
                          onClick={() => void markPaid(row)}
                        >
                          Mark paid
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && !payments.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No {kind === "DLP" ? "DLP" : "franchisee"} payments yet. Record one to pay a franchisee.
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {kind === "DLP" ? "Pay DLP to franchisee" : "Pay franchisee"}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-sm text-gray-600">Franchisee</p>
                <select
                  value={form.payeeUserId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, payeeUserId: e.target.value, projectId: "" }))
                  }
                  className={fieldClass}
                >
                  <option value="">Select franchisee</option>
                  {franchisees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {user.roleLabel ? ` · ${user.roleLabel}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Assigned project</p>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className={fieldClass}
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
                  <p className="mt-1 text-xs text-error-500">
                    This franchisee has no assigned projects. Assign a project first.
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-sm text-gray-600">Amount (₹)</p>
                  <input
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Payment date</p>
                  <input
                    type="date"
                    value={form.paidDate}
                    onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Method</p>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className={fieldClass}
                >
                  {METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.markPaid}
                  onChange={(e) => setForm((f) => ({ ...f, markPaid: e.target.checked }))}
                />
                Mark as paid now (company has transferred the amount)
              </label>
              {!form.markPaid ? (
                <div>
                  <p className="mb-1 text-sm text-gray-600">Paid now (₹)</p>
                  <input
                    type="number"
                    min={0}
                    value={form.paidAmount}
                    onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))}
                    className={fieldClass}
                  />
                </div>
              ) : null}
              <div>
                <p className="mb-1 text-sm text-gray-600">Remark</p>
                <input
                  value={form.remark}
                  onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                  className={fieldClass}
                  placeholder={kind === "DLP" ? "Delay in payment settlement" : "Work payout"}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void savePay()} disabled={saving}>
                {saving ? "Saving…" : kind === "DLP" ? "Save DLP payment" : "Save payout"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
