"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { dashboardApi, storesApi, type DashboardDto } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const PIPELINE_COLORS = [
  "bg-brand-300",
  "bg-brand-400",
  "bg-brand-500",
  "bg-brand-600",
  "bg-brand-700",
  "bg-success-500",
];

const quickActions = [
  { label: "Add Lead", href: "/sales/leads/new", permissions: ["sales.manage", "sales.full", "leads.manage"] },
  { label: "Create Quotation", href: "/quotations?create=1", permissions: ["quotations.create", "quotations.manage", "sales.full"] },
  { label: "AI Designing", href: "/design/designing", permissions: ["design.manage"] },
  { label: "Work Order", href: "/work-orders", permissions: ["workorders.manage", "workorders.update", "site.manage"] },
  { label: "Payments", href: "/payments", permissions: ["payments.manage", "finance.manage", "finance.full"] },
];

const selectClass =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function quotationBadgeColor(status: string) {
  if (status === "VIEWED" || status === "ACCEPTED") return "info";
  if (status === "SENT") return "primary";
  if (status === "DRAFT") return "light";
  return "warning";
}

export default function CrmDashboard() {
  const { user } = useAuth();
  const [storeFilterId, setStoreFilterId] = useState("");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [stats, setStats] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await storesApi.list({ limit: 100 });
        setStores(res.items.map((s) => ({ id: s.id, name: s.name })));
      } catch {
        /* optional filter */
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await dashboardApi.get(storeFilterId || undefined);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setStats(null);
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeFilterId]);

  const kpis = useMemo(() => {
    const s = stats?.summary;
    if (!s) return [];
    return [
      {
        label: "Open Leads",
        value: String(s.openLeads),
        change: `${s.leads} total leads`,
        positive: true,
        href: "/sales/leads",
      },
      {
        label: "Quotations Sent",
        value: String(s.quotationsSent),
        change: `${s.quotations} total quotations`,
        positive: true,
        href: "/quotations",
      },
      {
        label: "Active Projects",
        value: String(s.activeProjects),
        change: `${s.projects} total projects`,
        positive: true,
        href: "/projects",
      },
      {
        label: "Month Revenue",
        value: formatINR(Number(s.revenueThisMonth || 0)),
        change: `${formatINR(Number(s.revenueCollected || 0))} all time`,
        positive: true,
        href: "/payments",
      },
      {
        label: "Pending Payments",
        value: formatINR(Number(s.pendingPayments || 0)),
        change: `${s.pendingPaymentCount} invoice${s.pendingPaymentCount === 1 ? "" : "s"} due`,
        positive: false,
        href: "/payments",
      },
      {
        label: "Warranty Tickets",
        value: String(s.warrantyOpen),
        change: s.warrantyOverdue > 0 ? `${s.warrantyOverdue} overdue` : "Open tickets",
        positive: s.warrantyOverdue === 0,
        href: "/warranty-desk",
      },
    ];
  }, [stats]);

  const pipeline = stats?.pipeline ?? [];
  const pipelineTotal = pipeline.reduce((sum, p) => sum + p.count, 0) || 1;

  const visibleQuickActions = quickActions.filter((a) =>
    hasAnyPermission(user, a.permissions)
  );

  return (
    <div className="space-y-5">
      {loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading dashboard…
        </div>
      )}
      {error ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 px-5 py-6 text-white sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
              Santoshi Interior CRM
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Operations Dashboard
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Live view of leads, quotations, projects, payments and store
              performance from your database.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={storeFilterId}
              onChange={(e) => setStoreFilterId(e.target.value)}
              className={`${selectClass} border-white/20 bg-white/10 text-white`}
            >
              <option value="" className="text-gray-800">
                All Stores
              </option>
              {stores.map((store) => (
                <option key={store.id} className="text-gray-800" value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {hasAnyPermission(user, ["sales.manage", "sales.full", "leads.manage"]) ? (
              <Link href="/sales/leads/new">
                <Button size="sm">+ Add Lead</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {kpi.value}
            </p>
            <p
              className={`mt-1 text-xs ${
                kpi.positive ? "text-success-600" : "text-warning-600"
              }`}
            >
              {kpi.change}
            </p>
          </Link>
        ))}
      </div>

      {visibleQuickActions.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {visibleQuickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button size="sm" variant="outline">
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Lead Pipeline
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats?.summary.openLeads ?? 0} open · {pipelineTotal} in pipeline
              </p>
            </div>
            <Link href="/sales/leads" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              View all
            </Link>
          </div>
          {pipeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No leads in pipeline yet.</p>
          ) : (
            <div className="space-y-3">
              {pipeline.map((stage, i) => {
                const pct = Math.round((stage.count / pipelineTotal) * 100);
                return (
                  <div key={stage.stage}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{stage.stage}</span>
                      <span className="font-medium text-gray-800 dark:text-white/90">{stage.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all ${PIPELINE_COLORS[i % PIPELINE_COLORS.length]}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Follow-ups Due
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Next 7 days</p>
            </div>
            <Link href="/sales/leads" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              Open leads
            </Link>
          </div>
          <div className="space-y-3">
            {(stats?.followUpsDue ?? []).map((item) => (
              <Link
                key={item.id}
                href={`/sales/leads/${item.leadId}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 transition hover:border-brand-200 dark:border-gray-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.client}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.store} · {enumToLabel(item.type)}
                  </p>
                </div>
                <Badge size="sm" color={item.overdue ? "error" : "warning"}>
                  {item.when}
                </Badge>
              </Link>
            ))}
            {!stats?.followUpsDue?.length && (
              <p className="py-6 text-center text-sm text-gray-400">No follow-ups scheduled.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Store Performance
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leads, projects & revenue this month by branch
            </p>
          </div>
          <Link href="/stores" className="text-sm font-medium text-brand-500 hover:text-brand-600">
            Manage stores
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {(stats?.storePerformance ?? []).map((store) => (
            <div key={store.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{store.store}</p>
                  <p className="text-xs text-gray-500">{store.city}</p>
                </div>
                <Badge size="sm" color="success">
                  {store.conversion} win
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-400">Leads</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{store.leads}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-400">Projects</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{store.projects}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.revenue >= 100000
                      ? `${(store.revenue / 100000).toFixed(1)}L`
                      : formatINR(store.revenue)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {!stats?.storePerformance?.length && (
            <p className="col-span-full py-6 text-center text-sm text-gray-400">No store data yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Recent Leads</h2>
            <Link href="/sales/leads" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(stats?.recentLeads ?? []).map((lead) => (
              <Link
                key={lead.id}
                href={`/sales/leads/${lead.id}`}
                className="block rounded-xl border border-gray-100 px-3 py-3 transition hover:border-brand-200 dark:border-gray-800"
              >
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{lead.clientName}</p>
                <p className="text-xs text-gray-500">
                  {lead.store?.name || "—"} · {enumToLabel(lead.status)} · {formatDate(lead.updatedAt)}
                </p>
              </Link>
            ))}
            {!stats?.recentLeads?.length && (
              <p className="py-6 text-center text-sm text-gray-400">No leads yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Recent Quotations</h2>
            <Link href="/quotations" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(stats?.recentQuotations ?? []).map((q) => (
              <Link
                key={q.id}
                href={`/quotations/${q.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 transition hover:border-brand-200 dark:border-gray-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{q.client}</p>
                  <p className="text-xs text-gray-500">
                    {q.store?.name || "—"} · {formatDate(q.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatINR(q.amount)}
                  </p>
                  <Badge size="sm" color={quotationBadgeColor(q.status)}>
                    {enumToLabel(q.status)}
                  </Badge>
                </div>
              </Link>
            ))}
            {!stats?.recentQuotations?.length && (
              <p className="py-6 text-center text-sm text-gray-400">No quotations yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Active Projects</h2>
            <Link href="/projects" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {(stats?.recentProjects ?? []).map((project) => (
              <Link key={project.id} href={`/projects`} className="block">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{project.name}</p>
                    <p className="text-xs text-gray-500">
                      {project.clientName || "—"} · {project.store?.name || "—"} · {enumToLabel(project.status)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </Link>
            ))}
            {!stats?.recentProjects?.length && (
              <p className="py-6 text-center text-sm text-gray-400">No projects yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
