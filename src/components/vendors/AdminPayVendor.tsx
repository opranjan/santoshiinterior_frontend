"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { paymentsApi, usersApi, vendorsApi } from "@/services/crmApi";
import type { AuthUser } from "@/lib/auth";
import { formatDate } from "@/lib/mappers";

type ProjectRow = { id: string; name: string; clientName?: string | null; storeId?: string | null };
type PaymentRow = {
  id: string;
  invoiceNo?: string | null;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  method?: string;
  paidDate?: string | null;
  createdAt?: string;
  project?: { id: string; name: string } | null;
  payee?: { id: string; name: string } | null;
};

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function isVendorAccount(user: AuthUser) {
  return user.accessRole?.key === "VENDOR" || Boolean(user.vendorId);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

export default function AdminPayVendor() {
  const [people, setPeople] = useState<AuthUser[]>([]);
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
    method: "UPI",
    paidDate: todayIso(),
    remark: "",
    markPaid: true,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, paymentRes] = await Promise.all([
        usersApi.list({ limit: 200, isActive: "true" }),
        paymentsApi.list({ limit: 200, type: "VENDOR" }),
      ]);
      const vendors = (usersRes.items || []).filter(isVendorAccount);
      setPeople(vendors);
      setPayments((paymentRes.items || []) as PaymentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const payee = people.find((row) => row.id === form.payeeUserId);
    if (!payee?.vendorId) {
      setProjects([]);
      return;
    }
    vendorsApi
      .projects(payee.vendorId)
      .then((res) =>
        setProjects(
          (res.items || []).map((row) => ({
            id: row.project.id,
            name: row.project.name,
            clientName: row.project.clientName,
            storeId: row.project.store?.id,
          }))
        )
      )
      .catch(() => setProjects([]));
  }, [form.payeeUserId, people]);

  const totals = useMemo(() => {
    const amount = payments.reduce((sum, row) => sum + money(row.amount), 0);
    const paid = payments.reduce(
      (sum, row) => sum + (money(row.paidAmount) || (row.status === "PAID" ? money(row.amount) : 0)),
      0
    );
    return { count: payments.length, amount, paid, pending: Math.max(0, amount - paid) };
  }, [payments]);

  const savePay = async () => {
    const amount = Number(form.amount) || 0;
    if (!form.payeeUserId) {
      setError("Select the vendor login to pay.");
      return;
    }
    if (!form.projectId) {
      setError("Select a project assigned to this vendor.");
      return;
    }
    if (amount <= 0) {
      setError("Enter a payment amount.");
      return;
    }
    const project = projects.find((row) => row.id === form.projectId);
    const payee = people.find((row) => row.id === form.payeeUserId);
    setSaving(true);
    setError("");
    try {
      await paymentsApi.create({
        invoiceNo: `VP-${Date.now().toString().slice(-8)}`,
        type: "VENDOR",
        projectId: form.projectId,
        storeId: project?.storeId || null,
        clientName: project?.clientName || payee?.name || null,
        payeeUserId: form.payeeUserId,
        amount,
        paidAmount: form.markPaid ? amount : 0,
        status: form.markPaid ? "PAID" : "PENDING",
        method: form.method,
        paidDate: form.markPaid ? `${form.paidDate}T00:00:00.000Z` : null,
        remark: form.remark.trim() || null,
      });
      setFormOpen(false);
      setNotice("Vendor payment recorded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Pay Vendor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Company payouts to vendors for assigned projects. Separate from customer collections and franchisee payouts.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setForm({
              payeeUserId: people[0]?.id || "",
              projectId: "",
              amount: "",
              method: "UPI",
              paidDate: todayIso(),
              remark: "",
              markPaid: true,
            });
            setFormOpen(true);
            setError("");
          }}
        >
          + Pay Vendor
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{notice}</div> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-xs text-gray-500 dark:text-gray-400">Records</p><p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{loading ? "—" : totals.count}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-xs text-gray-500 dark:text-gray-400">Total</p><p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{formatINR(totals.amount)}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-xs text-gray-500 dark:text-gray-400">Paid</p><p className="mt-2 text-2xl font-semibold text-success-600">{formatINR(totals.paid)}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-xs text-gray-500 dark:text-gray-400">Pending</p><p className="mt-2 text-2xl font-semibold text-[#E85D75]">{formatINR(totals.pending)}</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="min-w-full text-sm text-gray-700 dark:text-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2.5">{row.invoiceNo}</td>
                <td className="px-4 py-2.5">{row.payee?.name || "—"}</td>
                <td className="px-4 py-2.5">{row.project?.name || "—"}</td>
                <td className="px-4 py-2.5">{formatINR(money(row.amount))}</td>
                <td className="px-4 py-2.5">{formatDate(row.paidDate || row.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <Badge size="sm" color={row.status === "PAID" ? "success" : "warning"}>
                    {row.status || "PENDING"}
                  </Badge>
                </td>
              </tr>
            ))}
            {!loading && !payments.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No vendor payments yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 text-gray-800 shadow-2xl dark:bg-gray-900 dark:text-white/90">
            <h3 className="text-lg font-semibold">Pay vendor</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Vendor login
                <select className={`${fieldClass} mt-1`} value={form.payeeUserId} onChange={(e) => setForm((f) => ({ ...f, payeeUserId: e.target.value, projectId: "" }))}>
                  <option value="">Select</option>
                  {people.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} {row.vendor?.name ? `(${row.vendor.name})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Assigned project
                <select className={`${fieldClass} mt-1`} value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                  <option value="">Select</option>
                  {projects.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Amount
                <input className={`${fieldClass} mt-1`} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </label>
              <label className="block text-sm">
                Method
                <select className={`${fieldClass} mt-1`} value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.markPaid} onChange={(e) => setForm((f) => ({ ...f, markPaid: e.target.checked }))} />
                Mark as paid now
              </label>
              <label className="block text-sm">
                Remark
                <input className={`${fieldClass} mt-1`} value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={saving} onClick={() => void savePay()}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
