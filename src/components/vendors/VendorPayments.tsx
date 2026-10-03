"use client";

import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import VendorPageHeader from "@/components/vendors/VendorPageHeader";
import { paymentsApi } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";

type PaymentRow = {
  id: string;
  invoiceNo?: string | null;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  method?: string;
  remark?: string | null;
  paidDate?: string | null;
  createdAt?: string;
  project?: { id: string; name: string } | null;
};

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

export default function VendorPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsApi
      .list({ limit: 100, type: "VENDOR" })
      .then((res) => setPayments((res.items || []) as PaymentRow[]))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const amount = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const paid = payments.reduce(
      (sum, row) => sum + (Number(row.paidAmount || 0) || (row.status === "PAID" ? Number(row.amount || 0) : 0)),
      0
    );
    return { amount, paid, pending: Math.max(0, amount - paid) };
  }, [payments]);

  return (
    <div className="space-y-6">
      <VendorPageHeader
        title="Payments"
        subtitle="Payouts from Santoshi Interior for your assigned work. Customer collections are handled in CRM."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total", value: formatINR(totals.amount) },
          { label: "Received", value: formatINR(totals.paid) },
          { label: "Pending", value: formatINR(totals.pending) },
        ].map((item, index) => (
          <div key={item.label} className={`vendor-card vendor-rise p-5 vendor-rise-delay-${index + 1}`}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a7748]">{item.label}</p>
            <p className="vendor-serif mt-2 text-3xl">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="vendor-card vendor-rise vendor-rise-delay-4 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f4efe6] text-left text-[11px] uppercase tracking-[0.16em] text-[#9a7748]">
            <tr>
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5">{row.invoiceNo || "—"}</td>
                <td className="px-4 py-2.5">{row.project?.name || "—"}</td>
                <td className="px-4 py-2.5">{formatINR(Number(row.amount || 0))}</td>
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
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No vendor payouts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
