"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { dashboardApi, storesApi, type DashboardDto } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";

type StoreFilter = string;

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const kpis = [
  {
    label: "Open Leads",
    value: "52",
    change: "+8 this week",
    positive: true,
    href: "/sales/leads",
  },
  {
    label: "Quotations Sent",
    value: "18",
    change: "₹1.24 Cr pipeline",
    positive: true,
    href: "/sales/quotations",
  },
  {
    label: "Active Projects",
    value: "22",
    change: "7 near handover",
    positive: true,
    href: "/projects",
  },
  {
    label: "Month Revenue",
    value: "₹85 L",
    change: "+12% vs last month",
    positive: true,
    href: "/payments",
  },
  {
    label: "Pending Payments",
    value: "₹28 L",
    change: "9 invoices due",
    positive: false,
    href: "/payments",
  },
  {
    label: "Warranty Tickets",
    value: "6",
    change: "2 overdue",
    positive: false,
    href: "/warranty-desk",
  },
];

const pipeline = [
  { stage: "New", count: 14, barClass: "bg-brand-300" },
  { stage: "Contacted", count: 11, barClass: "bg-brand-400" },
  { stage: "Site Visit", count: 9, barClass: "bg-brand-500" },
  { stage: "Quotation", count: 8, barClass: "bg-brand-600" },
  { stage: "Negotiation", count: 6, barClass: "bg-brand-700" },
  { stage: "Won", count: 4, barClass: "bg-success-500" },
];

const storePerformance = [
  {
    store: "Main Branch",
    city: "Indore",
    leads: 24,
    projects: 11,
    revenue: 4200000,
    conversion: "28%",
  },
  {
    store: "North Store",
    city: "Bhopal",
    leads: 16,
    projects: 7,
    revenue: 2850000,
    conversion: "24%",
  },
  {
    store: "South Store",
    city: "Ujjain",
    leads: 12,
    projects: 4,
    revenue: 1450000,
    conversion: "19%",
  },
];

const followUpsDue = [
  {
    id: "LD-1004",
    client: "Meera Joshi",
    store: "South Store",
    type: "Call",
    when: "Today",
    overdue: true,
  },
  {
    id: "LD-1001",
    client: "Ananya Kapoor",
    store: "Main Branch",
    type: "Site Visit",
    when: "Today",
    overdue: false,
  },
  {
    id: "LD-1002",
    client: "Rajesh Malhotra",
    store: "North Store",
    type: "Quotation Follow-up",
    when: "Tomorrow",
    overdue: false,
  },
  {
    id: "LD-1005",
    client: "Suresh Agarwal",
    store: "North Store",
    type: "Negotiation Call",
    when: "01 Aug",
    overdue: false,
  },
];

const recentQuotations = [
  {
    id: "QT-2401",
    client: "Rajesh Malhotra",
    amount: 1850000,
    status: "Sent",
    store: "North Store",
  },
  {
    id: "QT-2402",
    client: "TechNest Pvt Ltd",
    amount: 6200000,
    status: "Viewed",
    store: "Main Branch",
  },
  {
    id: "QT-2403",
    client: "Meera Joshi",
    amount: 780000,
    status: "Draft",
    store: "South Store",
  },
];

const recentProjects = [
  {
    name: "Desai 3BHK Interiors",
    client: "Neha & Rohan Desai",
    store: "Main Branch",
    progress: 78,
    stage: "Execution",
  },
  {
    name: "TechNest Office Fit-out",
    client: "TechNest Pvt Ltd",
    store: "Main Branch",
    progress: 42,
    stage: "Design",
  },
  {
    name: "Malhotra Villa",
    client: "Rajesh Malhotra",
    store: "North Store",
    progress: 15,
    stage: "Kickoff",
  },
];

const quickActions = [
  { label: "Add Lead", href: "/sales/leads/new" },
  { label: "Create Quotation", href: "/sales/quotations/new" },
  { label: "AI Designing", href: "/design/designing" },
  { label: "AI Elevation", href: "/design/elevation" },
  { label: "Work Order", href: "/work-orders" },
  { label: "Payments", href: "/payments" },
];

const selectClass =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function CrmDashboard() {
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("All Stores");
  const [storeNames, setStoreNames] = useState<string[]>(["All Stores"]);
  const [stats, setStats] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stores = await storesApi.list({ limit: 100 });
        setStoreNames(["All Stores", ...stores.items.map((s) => s.name)]);
      } catch {
        // keep default
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await dashboardApi.get();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveKpis = useMemo(() => {
    if (!stats) return kpis;
    const revenue = Number(stats.summary.revenueCollected || 0);
    return [
      {
        label: "Open Leads",
        value: String(stats.summary.openLeads),
        change: `${stats.summary.leads} total leads`,
        positive: true,
        href: "/sales/leads",
      },
      {
        label: "Quotations Sent",
        value: String(stats.summary.quotations),
        change: "All quotations",
        positive: true,
        href: "/sales/quotations",
      },
      {
        label: "Active Projects",
        value: String(stats.summary.activeProjects),
        change: `${stats.summary.projects} total projects`,
        positive: true,
        href: "/projects",
      },
      {
        label: "Revenue Collected",
        value: formatINR(revenue),
        change: `${stats.summary.stores} stores`,
        positive: true,
        href: "/payments",
      },
      {
        label: "Customers",
        value: String(stats.summary.customers),
        change: "Across all stores",
        positive: true,
        href: "/customers",
      },
      {
        label: "Won Leads",
        value: String(stats.summary.wonLeads),
        change: "Converted",
        positive: true,
        href: "/sales/leads",
      },
    ];
  }, [stats]);

  const filteredStores = useMemo(() => {
    if (storeFilter === "All Stores") return storePerformance;
    return storePerformance.filter((s) => s.store === storeFilter);
  }, [storeFilter]);

  const filteredFollowUps = useMemo(() => {
    if (storeFilter === "All Stores") return followUpsDue;
    return followUpsDue.filter((f) => f.store === storeFilter);
  }, [storeFilter]);

  const filteredQuotes = useMemo(() => {
    if (storeFilter === "All Stores") return recentQuotations;
    return recentQuotations.filter((q) => q.store === storeFilter);
  }, [storeFilter]);

  const filteredProjects = useMemo(() => {
    if (stats?.recentProjects?.length) {
      return stats.recentProjects.map((p) => ({
        name: p.name,
        client: p.clientName || "—",
        store: p.store?.name || "—",
        stage: enumToLabel(p.status),
        progress: p.progress,
      }));
    }
    if (storeFilter === "All Stores") return recentProjects;
    return recentProjects.filter((p) => p.store === storeFilter);
  }, [storeFilter, stats]);

  const recentLeadRows = useMemo(() => {
    if (!stats?.recentLeads?.length) return [];
    return stats.recentLeads.map((l) => ({
      id: l.id,
      client: l.clientName,
      store: l.store?.name || "—",
      status: enumToLabel(l.status),
      updated: formatDate(l.updatedAt),
    }));
  }, [stats]);

  const pipelineTotal = pipeline.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="space-y-5">
      {loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Syncing dashboard from API...
        </div>
      )}
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
              Multi-store view of leads, quotations, projects, payments and
              design workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value as StoreFilter)}
              className={`${selectClass} border-white/20 bg-white/10 text-white`}
            >
              {storeNames.map((name) => (
                <option key={name} className="text-gray-800" value={name}>
                  {name}
                </option>
              ))}
            </select>
            <Link href="/sales/leads/new">
              <Button size="sm">+ Add Lead</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {liveKpis.map((kpi) => (
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Quick Actions
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button size="sm" variant="outline">
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Lead Pipeline
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {pipelineTotal} active leads across stages
              </p>
            </div>
            <Link
              href="/sales/leads"
              className="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {pipeline.map((stage) => {
              const pct = Math.round((stage.count / pipelineTotal) * 100);
              return (
                <div key={stage.stage}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {stage.stage}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all ${stage.barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Follow-ups Due
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Today & upcoming
              </p>
            </div>
            <Link
              href="/sales/leads"
              className="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Open leads
            </Link>
          </div>

          <div className="space-y-3">
            {filteredFollowUps.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 dark:border-gray-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.client}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.id} · {item.store} · {item.type}
                  </p>
                </div>
                <Badge size="sm" color={item.overdue ? "error" : "warning"}>
                  {item.when}
                </Badge>
              </div>
            ))}
            {filteredFollowUps.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                No follow-ups for this store.
              </p>
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
              Leads, projects & monthly revenue by branch
            </p>
          </div>
          <Link
            href="/stores"
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Manage stores
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <div
              key={store.store}
              className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.store}
                  </p>
                  <p className="text-xs text-gray-500">{store.city}</p>
                </div>
                <Badge size="sm" color="success">
                  {store.conversion} win
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-400">Leads</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.leads}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-400">Projects</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {store.projects}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {(store.revenue / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Recent Quotations
            </h2>
            <Link
              href="/sales/quotations"
              className="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {filteredQuotes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 dark:border-gray-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {q.client}
                  </p>
                  <p className="text-xs text-gray-500">
                    {q.id} · {q.store}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {formatINR(q.amount)}
                  </p>
                  <Badge
                    size="sm"
                    color={
                      q.status === "Viewed"
                        ? "info"
                        : q.status === "Sent"
                        ? "primary"
                        : "light"
                    }
                  >
                    {q.status}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredQuotes.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                No quotations for this store.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Active Projects
            </h2>
            <Link
              href="/projects"
              className="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div key={project.name}>
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.client} · {project.store} · {project.stage}
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
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                No active projects for this store.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "AI Designing",
            desc: "Upload room photo + prompt",
            href: "/design/designing",
          },
          {
            title: "AI Elevation",
            desc: "Upload facade photo + prompt",
            href: "/design/elevation",
          },
          {
            title: "Work Orders",
            desc: "Site execution tracking",
            href: "/work-orders",
          },
          {
            title: "Warranty Desk",
            desc: "After-sales service tickets",
            href: "/warranty-desk",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {card.title}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {card.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
