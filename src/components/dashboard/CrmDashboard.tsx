"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
  ArrowRightIcon,
  BellIcon,
  BoltIcon,
  BoxCubeIcon,
  DollarLineIcon,
  FileIcon,
  FolderIcon,
  PlusIcon,
  TaskIcon,
  TimeIcon,
  UserCircleIcon,
} from "@/icons";
import CrmDashboardCharts from "@/components/dashboard/CrmDashboardCharts";
import { dashboardApi, storesApi, type DashboardDto } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission, canAccessAllStores } from "@/lib/permissions";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const PIPELINE_TONES = [
  { bar: "bg-[#d4b896]", hex: "#d4b896" },
  { bar: "bg-[#c4a574]", hex: "#c4a574" },
  { bar: "bg-[#9a7748]", hex: "#9a7748" },
  { bar: "bg-[#7d6139]", hex: "#7d6139" },
  { bar: "bg-[#5c472c]", hex: "#5c472c" },
  { bar: "bg-success-500", hex: "#12b76a" },
];

const card =
  "rounded-2xl border border-[#eadfcf] bg-white shadow-[0_12px_32px_rgba(28,22,16,0.04)] dark:border-gray-800 dark:bg-white/[0.03]";
const kicker = "text-[10px] font-medium uppercase tracking-[0.18em] text-[#9a7748]";
const heading = "font-serif text-2xl tracking-tight text-gray-800 dark:text-white/90";
const linkMuted = "text-xs font-medium uppercase tracking-[0.14em] text-[#9a7748] hover:text-[#7d6139]";

const quickActions = [
  {
    label: "Add Lead",
    hint: "Capture a new enquiry",
    href: "/sales/leads/new",
    permissions: ["sales.manage", "sales.full", "leads.manage"],
    Icon: PlusIcon,
  },
  {
    label: "Create Quotation",
    hint: "Send a client estimate",
    href: "/quotations?create=1",
    permissions: ["quotations.create", "quotations.manage", "sales.full"],
    Icon: FileIcon,
  },
  {
    label: "AI Designing",
    hint: "Open the design studio",
    href: "/design/designing",
    permissions: ["design.manage", "sales.view", "sales.manage", "sales.full", "leads.manage"],
    Icon: BoltIcon,
  },
  {
    label: "Work Order",
    hint: "Track site execution",
    href: "/work-orders",
    permissions: ["workorders.manage", "workorders.update", "site.manage"],
    Icon: TaskIcon,
  },
  {
    label: "Payments",
    hint: "Collect and reconcile",
    href: "/payments",
    permissions: ["payments.manage", "finance.manage", "finance.full"],
    Icon: DollarLineIcon,
  },
];

const selectClass =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function initials(name?: string | null) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

function quotationBadgeColor(status: string) {
  if (status === "VIEWED" || status === "ACCEPTED") return "info";
  if (status === "SENT") return "primary";
  if (status === "DRAFT") return "light";
  return "warning";
}

export default function CrmDashboard() {
  const { user } = useAuth();
  const orgView = canAccessAllStores(user);
  const [storeFilterId, setStoreFilterId] = useState(
    orgView ? "" : user?.storeId || ""
  );
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [stats, setStats] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgView && user?.storeId) {
      setStoreFilterId(user.storeId);
    }
  }, [orgView, user?.storeId]);

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

  const isSalesView = stats?.view === "sales" || !orgView;

  const kpis = useMemo(() => {
    const s = stats?.summary;
    if (!s) return [];
    const salesKpis = [
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
        label: "Follow-ups Due",
        value: String(s.followUpsDueCount ?? stats?.followUpsDue?.length ?? 0),
        change: "Next 7 days",
        positive: true,
        href: "/sales/leads",
      },
      {
        label: "Won Leads",
        value: String(s.wonLeads),
        change: "Your converted leads",
        positive: true,
        href: "/sales/leads",
      },
    ];
    if (isSalesView) return salesKpis;
    return [
      ...salesKpis.slice(0, 2),
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
        change:
          (s.warrantyOverdue ?? 0) > 0
            ? `${s.warrantyOverdue} overdue`
            : "Open tickets",
        positive: (s.warrantyOverdue ?? 0) === 0,
        href: "/warranty-desk",
      },
    ];
  }, [stats, isSalesView]);

  const pipeline = stats?.pipeline ?? [];
  const pipelineTotal = pipeline.reduce((sum, p) => sum + p.count, 0) || 1;

  const visibleQuickActions = quickActions.filter((a) =>
    hasAnyPermission(user, a.permissions)
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-5 pb-6">
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

      <section className={`${card} dash-panel overflow-hidden`}>
        <div className="flex flex-col bg-black lg:h-36 lg:flex-row lg:items-stretch">
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
                {isSalesView ? "My Sales Dashboard" : "Operations Dashboard"}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#d8d0c3]">
                {isSalesView
                  ? "Your leads, follow-ups and quotations for the store assigned to you."
                  : "Live view of leads, quotations, projects, payments and store performance from your database."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {orgView ? (
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
              ) : stores[0] ? (
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                  {stores[0].name}
                </span>
              ) : null}
              {hasAnyPermission(user, ["sales.manage", "sales.full", "leads.manage"]) ? (
                <Link href="/sales/leads/new">
                  <Button size="sm">+ Add Lead</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className={`${card} dash-kpi dash-delay-${(index % 6) + 1} p-5`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={kicker}>{kpi.label}</p>
              <span
                className={`mt-0.5 h-2 w-2 rounded-full ${kpi.positive ? "bg-success-500" : "bg-warning-500"}`}
              />
            </div>
            <p className="dash-kpi-value mt-3 font-serif text-3xl tracking-tight text-gray-800 dark:text-white/90">
              {kpi.value}
            </p>
            <p className={`mt-2 text-xs ${kpi.positive ? "text-success-600" : "text-warning-600"}`}>
              {kpi.change}
            </p>
          </Link>
        ))}
      </div>

      {visibleQuickActions.length > 0 ? (
        <div className={`${card} dash-panel p-5`}>
          <p className={kicker}>Shortcuts</p>
          <h2 className={`${heading} mb-4 mt-1`}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {visibleQuickActions.map((action, index) => {
              const Icon = action.Icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`dash-action dash-delay-${(index % 6) + 1}`}
                >
                  <span className="dash-action-icon">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-lg tracking-tight text-gray-800 dark:text-white/90">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#8a8175] dark:text-gray-400">
                      {action.hint}
                    </span>
                  </span>
                  <ArrowRightIcon className="dash-action-arrow ml-auto size-4 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className={`${card} dash-panel overflow-hidden p-5 xl:col-span-7`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className={kicker}>Sales</p>
              <h2 className={`${heading} mt-1`}>Lead Pipeline</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="dash-stat-pill">{stats?.summary.openLeads ?? 0} open</span>
                <span className="dash-stat-pill">{pipeline.reduce((sum, p) => sum + p.count, 0)} in pipeline</span>
              </div>
            </div>
            <Link href="/sales/leads" className={linkMuted}>
              View all
            </Link>
          </div>
          {pipeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No leads in pipeline yet.</p>
          ) : (
            <>
              <div className="dash-funnel mb-5 flex h-3 overflow-hidden rounded-full">
                {pipeline.map((stage, i) => {
                  const pct = Math.max((stage.count / pipelineTotal) * 100, stage.count ? 4 : 0);
                  return (
                    <span
                      key={`funnel-${stage.stage}`}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        background: PIPELINE_TONES[i % PIPELINE_TONES.length].hex,
                      }}
                    />
                  );
                })}
              </div>
              <div className="space-y-2.5">
                {pipeline.map((stage, i) => {
                  const pct = Math.round((stage.count / pipelineTotal) * 100);
                  const tone = PIPELINE_TONES[i % PIPELINE_TONES.length];
                  return (
                    <div key={stage.stage} className={`dash-stage dash-delay-${(i % 6) + 1}`}>
                      <span className="dash-stage-index" style={{ background: tone.hex }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                            {stage.stage}
                          </span>
                          <span className="text-[11px] text-[#8a8175]">{pct}%</span>
                        </div>
                        <div className="dash-bar h-2 overflow-hidden rounded-full bg-[#efe8db] dark:bg-gray-800">
                          <span
                            className={`block h-full rounded-full ${tone.bar}`}
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                      <p className="w-10 shrink-0 text-right font-serif text-2xl tracking-tight text-gray-800 dark:text-white/90">
                        {stage.count}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className={`${card} dash-panel overflow-hidden p-5 xl:col-span-5`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className={kicker}>Reminders</p>
              <h2 className={`${heading} mt-1`}>Follow-ups Due</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Next 7 days</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="dash-stat-pill">
                <BellIcon className="size-3.5" />
                {stats?.followUpsDue?.length ?? 0}
              </span>
              <Link href="/sales/leads" className={linkMuted}>
                Open leads
              </Link>
            </div>
          </div>
          {(stats?.followUpsDue ?? []).length ? (
            <div className="dash-timeline space-y-2.5">
              {(stats?.followUpsDue ?? []).map((item, i) => (
                <Link
                  key={item.id}
                  href={`/sales/leads/${item.leadId}`}
                  className={`dash-remind dash-delay-${(i % 6) + 1} ${item.overdue ? "is-overdue" : ""}`}
                >
                  <span className={`dash-remind-dot ${item.overdue ? "is-overdue" : ""}`} />
                  <span className="dash-remind-avatar">
                    {(item.client || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-lg leading-6 tracking-tight text-gray-800 dark:text-white/90">
                      {item.client}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#8a8175]">
                      {item.store} · {enumToLabel(item.type)}
                    </span>
                  </span>
                  <span className={`dash-remind-when ${item.overdue ? "is-overdue" : ""}`}>
                    <TimeIcon className="size-3.5" />
                    {item.when}
                  </span>
                  <ArrowRightIcon className="dash-action-arrow size-4 shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f2] px-4 py-10 text-center dark:border-gray-800 dark:bg-white/[0.02]">
              <BellIcon className="mx-auto size-6 text-[#c4a574]" />
              <p className="mt-2 text-sm text-gray-400">No follow-ups scheduled.</p>
            </div>
          )}
        </div>
      </div>

      <CrmDashboardCharts
        pipeline={pipeline}
        stores={stats?.storePerformance ?? []}
        quotations={stats?.recentQuotations ?? []}
        leads={stats?.recentLeads ?? []}
      />

      {!isSalesView ? (
        <div className={`${card} dash-panel overflow-hidden p-5`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className={kicker}>Branches</p>
              <h2 className={`${heading} mt-1`}>Store Performance</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leads, projects & revenue this month by branch
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="dash-stat-pill">
                <BoxCubeIcon className="size-3.5" />
                {stats?.storePerformance?.length ?? 0}
              </span>
              <Link href="/stores" className={linkMuted}>
                Manage stores
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(stats?.storePerformance ?? []).map((store, i) => (
              <div key={store.id} className={`dash-store dash-delay-${(i % 6) + 1}`}>
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="dash-remind-avatar">{initials(store.store)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-lg tracking-tight text-gray-800 dark:text-white/90">
                        {store.store}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8175]">{store.city}</p>
                    </div>
                  </div>
                  <span className="dash-stat-pill shrink-0">{store.conversion} win</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="dash-metric">
                    <p>Leads</p>
                    <strong>{store.leads}</strong>
                  </div>
                  <div className="dash-metric">
                    <p>Projects</p>
                    <strong>{store.projects}</strong>
                  </div>
                  <div className="dash-metric">
                    <p>Revenue</p>
                    <strong>
                      {store.revenue >= 100000
                        ? `${(store.revenue / 100000).toFixed(1)}L`
                        : formatINR(store.revenue)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
            {!stats?.storePerformance?.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f2] px-4 py-10 text-center dark:border-gray-800 dark:bg-white/[0.02]">
                <BoxCubeIcon className="mx-auto size-6 text-[#c4a574]" />
                <p className="mt-2 text-sm text-gray-400">No store data yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className={`${card} dash-panel overflow-hidden p-5 xl:col-span-4`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className={kicker}>Pipeline</p>
              <h2 className={heading}>Recent Leads</h2>
            </div>
            <Link href="/sales/leads" className={linkMuted}>
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {(stats?.recentLeads ?? []).map((lead, i) => (
              <Link
                key={lead.id}
                href={`/sales/leads/${lead.id}`}
                className={`dash-item dash-delay-${(i % 6) + 1}`}
              >
                <span className="dash-remind-avatar">{initials(lead.clientName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-lg leading-6 tracking-tight text-gray-800 dark:text-white/90">
                    {lead.clientName}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#8a8175]">
                    {lead.store?.name || "—"} · {formatDate(lead.updatedAt)}
                  </span>
                </span>
                <span className="dash-stat-pill shrink-0">{enumToLabel(lead.status)}</span>
                <ArrowRightIcon className="dash-action-arrow size-4 shrink-0" />
              </Link>
            ))}
            {!stats?.recentLeads?.length && (
              <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f2] px-4 py-10 text-center dark:border-gray-800 dark:bg-white/[0.02]">
                <UserCircleIcon className="mx-auto size-6 text-[#c4a574]" />
                <p className="mt-2 text-sm text-gray-400">No leads yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className={`${card} dash-panel overflow-hidden p-5 xl:col-span-4`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className={kicker}>Estimates</p>
              <h2 className={heading}>Recent Quotations</h2>
            </div>
            <Link href="/quotations" className={linkMuted}>
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {(stats?.recentQuotations ?? []).map((q, i) => (
              <Link
                key={q.id}
                href={`/quotations/${q.id}`}
                className={`dash-item dash-delay-${(i % 6) + 1}`}
              >
                <span className="dash-action-icon">
                  <FileIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-lg leading-6 tracking-tight text-gray-800 dark:text-white/90">
                    {q.client}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#8a8175]">
                    {q.store?.name || "—"} · {formatDate(q.createdAt)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-serif text-lg tracking-tight text-gray-800 dark:text-white/90">
                    {formatINR(q.amount)}
                  </span>
                  <Badge size="sm" color={quotationBadgeColor(q.status)}>
                    {enumToLabel(q.status)}
                  </Badge>
                </span>
                <ArrowRightIcon className="dash-action-arrow size-4 shrink-0" />
              </Link>
            ))}
            {!stats?.recentQuotations?.length && (
              <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f2] px-4 py-10 text-center dark:border-gray-800 dark:bg-white/[0.02]">
                <FileIcon className="mx-auto size-6 text-[#c4a574]" />
                <p className="mt-2 text-sm text-gray-400">No quotations yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className={`${card} dash-panel overflow-hidden p-5 xl:col-span-4`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className={kicker}>Execution</p>
              <h2 className={heading}>Active Projects</h2>
            </div>
            <Link href="/projects" className={linkMuted}>
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {(stats?.recentProjects ?? []).map((project, i) => (
              <Link
                key={project.id}
                href="/projects"
                className={`dash-item dash-delay-${(i % 6) + 1} !items-start`}
              >
                <span
                  className="dash-progress"
                  style={{
                    background: `conic-gradient(#c4a574 ${Math.max(project.progress, 0)}%, #efe8db 0)`,
                  }}
                >
                  <span>{project.progress}%</span>
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block truncate font-serif text-lg leading-6 tracking-tight text-gray-800 dark:text-white/90">
                    {project.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#8a8175]">
                    {project.clientName || "—"} · {project.store?.name || "—"} · {enumToLabel(project.status)}
                  </span>
                  <span className="dash-bar mt-2 block h-1.5 overflow-hidden rounded-full bg-[#efe8db] dark:bg-gray-800">
                    <span
                      className="block h-full rounded-full bg-[#c4a574]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </span>
                </span>
                <ArrowRightIcon className="dash-action-arrow mt-2 size-4 shrink-0" />
              </Link>
            ))}
            {!stats?.recentProjects?.length && (
              <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f2] px-4 py-10 text-center dark:border-gray-800 dark:bg-white/[0.02]">
                <FolderIcon className="mx-auto size-6 text-[#c4a574]" />
                <p className="mt-2 text-sm text-gray-400">No projects yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
