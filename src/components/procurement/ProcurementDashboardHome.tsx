"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  procurementRequestsApi,
  purchaseOrdersApi,
  rfqApi,
  vendorsApi,
  type ProcurementRequestDto,
  type PurchaseOrderDto,
  type RfqDto,
} from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";
import { formatDate } from "@/lib/mappers";

const card =
  "rounded-2xl border border-[#eadfcf] bg-white shadow-[0_12px_32px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]";
const kicker = "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7748]";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const quickLinks = [
  {
    label: "Projects",
    hint: "Track project status and vendors",
    href: "/projects",
  },
  {
    label: "Purchase orders",
    hint: "Create and track POs / WOs",
    href: "/operations/procurement/orders",
  },
  {
    label: "Procurement requests",
    hint: "Material & service requests",
    href: "/operations/procurement/requests",
  },
  {
    label: "RFQ",
    hint: "Vendor quotations",
    href: "/operations/procurement/rfq",
  },
  {
    label: "Vendors",
    hint: "Supplier directory",
    href: "/operations/vendors",
  },
  {
    label: "Modular catalog",
    hint: "Collection orders",
    href: "/operations/procurement/modular-catalog",
  },
  {
    label: "Chat box",
    hint: "Message vendors",
    href: "/chat-box",
  },
];

function firstName(name?: string | null) {
  const raw = String(name || "there").trim();
  return raw.split(/\s+/)[0] || "there";
}

function poOpen(row: PurchaseOrderDto) {
  const status = String(row.status || row.orderState || "").toUpperCase();
  return !/COMPLETE|CANCEL|CLOSED|RECEIVED|DONE/.test(status);
}

export default function ProcurementDashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [requests, setRequests] = useState<ProcurementRequestDto[]>([]);
  const [pendingReview, setPendingReview] = useState(0);
  const [rfqs, setRfqs] = useState<RfqDto[]>([]);
  const [vendorCount, setVendorCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [orderRes, requestRes, rfqRes, vendorRes] = await Promise.all([
          purchaseOrdersApi.list({ limit: 100 }),
          procurementRequestsApi.list({ limit: 50 }),
          rfqApi.list({ limit: 50 }),
          vendorsApi.list({ limit: 200 }),
        ]);
        if (cancelled) return;
        setOrders(orderRes.items || []);
        setRequests(requestRes.items || []);
        setPendingReview(Number(requestRes.pendingReview || 0));
        setRfqs(rfqRes.items || []);
        setVendorCount(
          (vendorRes.items || []).filter(
            (v) => !/archiv|inactive|disabled/i.test(String(v.status || ""))
          ).length
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load procurement dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = useMemo(() => {
    const openOrders = orders.filter(poOpen);
    const openRequests = requests.filter(
      (row) => String(row.stage || "").toUpperCase() === "PENDING"
    );
    const openRfqs = rfqs.filter(
      (row) => String(row.status || "").toUpperCase() === "PENDING"
    );
    const openValue = openOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return [
      {
        label: "Open orders",
        value: String(openOrders.length),
        change: `${orders.length} total POs / WOs`,
        href: "/operations/procurement/orders",
      },
      {
        label: "Open value",
        value: formatINR(openValue),
        change: "Across open purchase orders",
        href: "/operations/procurement/orders",
      },
      {
        label: "Pending requests",
        value: String(openRequests.length),
        change:
          pendingReview > 0
            ? `${pendingReview} awaiting review`
            : `${requests.length} total requests`,
        href: "/operations/procurement/requests",
      },
      {
        label: "Active RFQs",
        value: String(openRfqs.length),
        change: `${rfqs.length} total RFQs`,
        href: "/operations/procurement/rfq",
      },
      {
        label: "Vendors",
        value: String(vendorCount),
        change: "Active suppliers",
        href: "/operations/vendors",
      },
    ];
  }, [orders, requests, rfqs, vendorCount, pendingReview]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, 6),
    [orders]
  );

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, 5),
    [requests]
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5 pb-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className={`${card} overflow-hidden`}>
        <div className="flex flex-col bg-[#1c1610] lg:h-36 lg:flex-row lg:items-stretch">
          <div className="flex h-36 w-full items-center justify-center bg-black lg:w-36 lg:shrink-0">
            <img
              src="/images/logo/santoshi-interiors.jpg"
              alt="Santoshi Interiors"
              className="h-full w-auto max-w-full object-contain"
            />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-4 border-t border-white/10 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:border-l lg:border-t-0 lg:px-8 lg:py-0">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#c4a574]">
                Santoshi Interiors CRM · {today}
              </p>
              <h1 className="mt-1 font-serif text-3xl tracking-tight text-[#f7f3ea] md:text-4xl">
                Procurement Dashboard
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#d8d0c3]">
                Welcome {firstName(user?.name)}. Track purchase orders, requests, RFQs, and vendors.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/operations/procurement/orders"
                className="inline-flex h-10 items-center rounded-xl bg-[#e8d5b5] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610]"
              >
                + New order
              </Link>
              <Link
                href="/operations/procurement/requests"
                className="inline-flex h-10 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
              >
                Requests
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className={`${card} p-5 transition hover:border-[#c4a574]`}>
            <p className={kicker}>{kpi.label}</p>
            <p className="mt-2 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-[#8a7b68]">{kpi.change}</p>
          </Link>
        ))}
      </div>

      <section className={`${card} p-5`}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className={kicker}>Quick actions</p>
            <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]">
              Jump into procurement
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-3 transition hover:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
            >
              <p className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs text-[#8a7b68]">{item.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={kicker}>Orders</p>
              <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]">
                Recent purchase orders
              </h2>
            </div>
            <Link
              href="/operations/procurement/orders"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7748]"
            >
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#eadfcf] px-4 py-8 text-center text-sm text-[#8a7b68] dark:border-[#3a342c]">
              No purchase orders yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((row) => (
                <Link
                  key={row.id}
                  href={`/operations/procurement/orders/${row.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3.5 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {row.code || row.title}
                    </p>
                    <p className="truncate text-xs text-[#8a7b68]">
                      {row.vendor || "No vendor"}
                      {row.project?.name ? ` · ${row.project.name}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                      {formatINR(Number(row.amount || 0))}
                    </p>
                    <p className="text-[11px] text-[#8a7b68]">
                      {row.status || row.orderState || "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={kicker}>Requests</p>
              <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]">
                Latest procurement requests
              </h2>
            </div>
            <Link
              href="/operations/procurement/requests"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7748]"
            >
              View all
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#eadfcf] px-4 py-8 text-center text-sm text-[#8a7b68] dark:border-[#3a342c]">
              No procurement requests yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((row) => (
                <Link
                  key={row.id}
                  href={`/operations/procurement/requests/${row.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3.5 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {row.code || row.name}
                    </p>
                    <p className="truncate text-xs text-[#8a7b68]">
                      {row.project?.name || "No project"} · {row.type}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9a7748]">
                      {row.stage}
                    </p>
                    <p className="text-[11px] text-[#8a7b68]">
                      {formatDate(row.updatedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
