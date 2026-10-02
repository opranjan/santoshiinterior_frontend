"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import VendorDashboardCharts from "@/components/vendors/VendorDashboardCharts";
import { paymentsApi, projectsApi, purchaseOrdersApi, rfqApi } from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";

type ProjectRow = { id: string; name: string; status?: string; address?: string | null };
type PaymentRow = {
  id: string;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  paidDate?: string | null;
  createdAt?: string;
};
type OrderRow = { id: string; code?: string; title?: string; amount?: number; orderState?: string; createdAt?: string };

function firstName(name?: string | null) {
  return String(name || "there").trim().split(/\s+/)[0] || "there";
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const ORDER_LABEL: Record<string, string> = {
  ORDER_CREATED: "Created",
  NOT_APPROVED: "Awaiting approval",
  INTERNALLY_APPROVED: "Approved",
  ORDER_ACCEPTED: "Accepted",
  PARTIALLY_DELIVERED: "Partial",
  FULLY_DELIVERED: "Delivered",
  ORDER_REJECTED: "Rejected",
};

function orderTone(state?: string) {
  if (state === "FULLY_DELIVERED") return "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (state === "ORDER_REJECTED") return "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200";
  if (state === "PARTIALLY_DELIVERED" || state === "ORDER_ACCEPTED") return "bg-[#f4efe6] text-[#9a7748]";
  return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
}

const shortcuts = [
  { label: "Design", href: "/design/designing", hint: "Rooms" },
  { label: "Elevation", href: "/design/elevation", hint: "Facades" },
  { label: "Orders", href: "/operations/procurement/orders", hint: "Deliver" },
  { label: "Payments", href: "/payments", hint: "Payouts" },
];

export default function VendorDashboardHome() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [rfqs, setRfqs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes, orderRes, rfqRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 100, type: "VENDOR" }).catch(() => ({ items: [] })),
          purchaseOrdersApi.list({ limit: 100 }).catch(() => ({ items: [] })),
          rfqApi.list({ limit: 50 }).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setProjects((projectRes.items || []) as ProjectRow[]);
        setPayments((paymentRes.items || []) as PaymentRow[]);
        setOrders((orderRes.items || []) as OrderRow[]);
        setRfqs(rfqRes.items || []);
      } catch {
        if (!cancelled) {
          setProjects([]);
          setPayments([]);
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paid = useMemo(
    () =>
      payments
        .filter((row) => String(row.status || "").toUpperCase() === "PAID")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [payments]
  );
  const pending = useMemo(
    () =>
      payments
        .filter((row) => String(row.status || "").toUpperCase() !== "PAID")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [payments]
  );
  const payoutTotal = paid + pending;
  const paidPct = payoutTotal > 0 ? Math.round((paid / payoutTotal) * 100) : 0;
  const awaiting = orders.filter((row) =>
    ["ORDER_CREATED", "INTERNALLY_APPROVED", "NOT_APPROVED"].includes(String(row.orderState || ""))
  ).length;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stats = [
    { label: "Projects", value: loading ? "—" : String(projects.length), href: "/projects" },
    { label: "Orders", value: loading ? "—" : String(orders.length), href: "/operations/procurement/orders" },
    { label: "RFQs", value: loading ? "—" : String(rfqs.length), href: "/operations/procurement/rfq" },
    { label: "Received", value: loading ? "—" : formatINR(paid), href: "/payments" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <section className="vendor-card vendor-rise overflow-hidden">
        <div className="flex flex-col bg-black lg:h-44 lg:flex-row lg:items-stretch">
          <div className="vendor-logo-frame">
            <img src="/images/logo/santoshi-interiors.jpg" alt="Santoshi Interiors" />
          </div>
          <div className="flex flex-1 flex-col justify-center border-t border-white/10 px-6 py-5 lg:border-l lg:border-t-0 lg:px-8 lg:py-0">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#c4a574]">Vendor panel · {today}</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#f7f3ea] md:text-4xl">
              Welcome, {firstName(user?.name)}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#d8d0c3]">
              {user?.vendor?.name || "Your workshop"} · assigned work from Santoshi Interiors
            </p>
            <div className="mt-4">
              <Link
                href="/operations/procurement/orders"
                className="inline-flex items-center gap-2 border border-[#c4a574] px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-[#c4a574] transition hover:bg-[#c4a574] hover:text-black"
              >
                {awaiting ? `${awaiting} orders to review` : "Review orders"}
              </Link>
            </div>
          </div>
        </div>

        <div className="vendor-metric-row border-t border-[#e4d9c8] bg-[#fbf8f2] dark:border-[var(--vendor-line)] dark:bg-[var(--vendor-paper)]">
          {stats.map((item) => (
            <Link key={item.label} href={item.href} className="hover:bg-[#f4efe6] dark:hover:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">{item.label}</p>
              <p className="vendor-serif mt-2 text-3xl">{item.value}</p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e4d9c8] px-6 py-4 dark:border-[var(--vendor-line)] md:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Pending payouts</p>
            <p className="vendor-serif mt-1 text-2xl">{loading ? "—" : formatINR(pending)}</p>
          </div>
          <div className="min-w-[200px] max-w-sm flex-1">
            <div className="h-1 overflow-hidden bg-[#e4d9c8] dark:bg-white/10">
              <div className="h-full bg-[#c4a574] transition-all duration-700" style={{ width: `${Math.max(paidPct, 3)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#8a8175]">{paidPct}% received</p>
          </div>
          <Link href="/payments" className="text-xs uppercase tracking-[0.16em] text-[#9a7748] hover:underline">
            Payment history
          </Link>
        </div>
      </section>

      <nav className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {shortcuts.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`vendor-card vendor-rise vendor-rise-delay-${index + 1} flex items-center justify-between px-4 py-4`}
          >
            <span>
              <span className="block font-medium text-[#111]">{item.label}</span>
              <span className="text-xs text-[#8a8175]">{item.hint}</span>
            </span>
            <span className="text-[#c4a574]">→</span>
          </Link>
        ))}
      </nav>

      {!loading ? (
        <VendorDashboardCharts payments={payments} orders={orders} />
      ) : (
        <div className="vendor-card p-10 text-center text-sm text-[#8a8175]">Preparing charts…</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="vendor-card vendor-rise p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="vendor-serif text-2xl text-[#111]">Orders</h2>
            <Link href="/operations/procurement/orders" className="text-xs uppercase tracking-[0.16em] text-[#9a7748]">
              All
            </Link>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-xl bg-[#fbf8f2] px-3 py-3 dark:bg-black/20">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#111]">{row.title || row.code || "Order"}</p>
                  <p className="text-xs text-[#8a8175]">{row.code}</p>
                </div>
                <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${orderTone(row.orderState)}`}>
                  {ORDER_LABEL[row.orderState || ""] || "—"}
                </span>
              </div>
            ))}
            {!loading && orders.length === 0 ? <p className="py-8 text-center text-sm text-[#8a8175]">No orders yet.</p> : null}
          </div>
        </section>

        <section className="vendor-card vendor-rise p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="vendor-serif text-2xl text-[#111]">Projects</h2>
            <Link href="/projects" className="text-xs uppercase tracking-[0.16em] text-[#9a7748]">
              All
            </Link>
          </div>
          <div className="space-y-2">
            {projects.slice(0, 5).map((row) => (
              <Link key={row.id} href="/projects" className="block rounded-xl bg-[#fbf8f2] px-3 py-3 dark:bg-black/20">
                <p className="text-sm font-medium text-[#111]">{row.name}</p>
                <p className="text-xs text-[#8a8175]">{row.address || "Assigned site"}</p>
              </Link>
            ))}
            {!loading && projects.length === 0 ? <p className="py-8 text-center text-sm text-[#8a8175]">No projects assigned yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
