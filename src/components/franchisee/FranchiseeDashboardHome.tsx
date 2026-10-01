"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { paymentsApi, projectsApi, warrantyApi } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";
import { useAuth } from "@/context/AuthContext";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  status?: string;
  address?: string | null;
  endDate?: string | null;
  budget?: string | null;
};

type PaymentRow = {
  id: string;
  amount?: number | string;
  paidAmount?: number | string;
  status?: string;
  type?: string;
  projectId?: string | null;
  project?: { id?: string } | null;
};

type IssueRow = {
  id: string;
  subject?: string | null;
  status?: string | null;
  project?: { name?: string | null } | null;
};

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function firstName(name?: string | null) {
  const raw = String(name || "there").trim();
  return raw.split(/\s+/)[0] || "there";
}

function bucketStatus(status?: string) {
  const key = String(status || "").toUpperCase();
  if (key === "COMPLETED") return "Completed";
  if (key === "ON_HOLD" || key === "KICKOFF") return "Pending";
  return "Ongoing";
}

function statusColor(label: string): "success" | "warning" | "error" | "info" {
  if (label === "Completed") return "success";
  if (label === "Ongoing") return "warning";
  if (label === "Pending") return "error";
  return "info";
}

const QUICK_ACTIONS = [
  { label: "Projects", hint: "View Projects", href: "/projects", icon: "📁" },
  { label: "Payments", hint: "View Payments", href: "/payments", icon: "₹" },
  { label: "Chat Box", hint: "Start Chat", href: "/chat", icon: "💬" },
  { label: "DLP Payment", hint: "Make Payment", href: "/dlp-payment", icon: "🧾" },
  { label: "Customer Issue", hint: "Raise Issue", href: "/customer-issues", icon: "⚠" },
  { label: "Documents", hint: "View Documents", href: "/documents", icon: "📄" },
];

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";

export default function FranchiseeDashboardHome() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [dlpPayments, setDlpPayments] = useState<PaymentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes, dlpRes, issueRes] = await Promise.all([
          projectsApi.list({ limit: 100 }),
          paymentsApi.list({ limit: 50, type: "FRANCHISEE_PAYOUT" }).catch(() => ({ items: [] })),
          paymentsApi.list({ limit: 50, type: "DLP" }).catch(() => ({ items: [] })),
          warrantyApi.list({ limit: 20 }).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setProjects((projectRes.items || []) as ProjectRow[]);
        setPayments((paymentRes.items || []) as PaymentRow[]);
        setDlpPayments((dlpRes.items || []) as PaymentRow[]);
        setIssues((issueRes.items || []) as IssueRow[]);
      } catch {
        if (!cancelled) {
          setProjects([]);
          setPayments([]);
          setDlpPayments([]);
          setIssues([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((row) => bucketStatus(row.status) === "Completed").length;
    const pending = projects.filter((row) => bucketStatus(row.status) === "Pending").length;
    const ongoing = Math.max(0, total - completed - pending);
    return { total, completed, ongoing, pending };
  }, [projects]);

  const earnings = useMemo(() => {
    const payouts = payments.filter((row) => {
      const kind = String(row.type || "").toUpperCase();
      return !kind || kind === "FRANCHISEE_PAYOUT" || kind.includes("FRANCHISEE");
    });
    const received = payouts
      .filter((row) => String(row.status || "").toUpperCase() === "PAID")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pending = payouts
      .filter((row) => String(row.status || "").toUpperCase() !== "PAID")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { received, pending, total: received + pending };
  }, [payments]);

  const dlpPending = useMemo(
    () =>
      dlpPayments.reduce(
        (sum, row) => sum + Math.max(0, Number(row.amount || 0) - Number(row.paidAmount || 0)),
        0
      ),
    [dlpPayments]
  );

  const category =
    user?.roleLabel && !/franchisee/i.test(user.roleLabel)
      ? user.roleLabel
      : user?.accessRole?.label && !/franchisee/i.test(user.accessRole.label)
        ? user.accessRole.label
        : "Carpenter";
  const tradeHint = /paint/i.test(category)
    ? "Painting & Finishes"
    : /modular|kitchen/i.test(category)
      ? "Modular & Kitchen"
      : "Wood Work & Carpentry";

  const kpis = [
    { label: "Total Projects", value: loading ? "—" : counts.total, tone: "text-brand-600", href: "/projects" },
    { label: "Completed", value: loading ? "—" : counts.completed, tone: "text-success-600", href: "/projects" },
    { label: "Ongoing", value: loading ? "—" : counts.ongoing, tone: "text-warning-600", href: "/projects" },
    { label: "Pending", value: loading ? "—" : counts.pending, tone: "text-error-600", href: "/projects" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Welcome back, {firstName(user?.name)}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">+ Add New Project</Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href} className={card}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                <p className={`mt-2 text-3xl font-semibold ${kpi.tone}`}>{kpi.value}</p>
                <p className="mt-3 text-xs font-medium text-brand-600">View all</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={card}>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">My Category</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-lg dark:bg-amber-500/15">
                  🔨
                </span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{category}</p>
                  <p className="text-xs text-gray-500">{tradeHint}</p>
                </div>
              </div>
              <Link
                href="/profile"
                className="mt-4 inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                View Category Details
              </Link>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Earnings Overview
              </p>
              <span className="text-xs text-gray-400">Company payouts</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Total Earnings</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {loading ? "—" : formatINR(earnings.total)}
              </p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Received from company</p>
                  <p className="font-semibold text-success-600">{formatINR(earnings.received)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="font-semibold text-error-500">{formatINR(earnings.pending)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={card}>
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-center transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.02]"
                >
                  <span className="text-lg">{action.icon}</span>
                  <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                    {action.label}
                  </p>
                  <p className="text-[11px] text-gray-400">{action.hint}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Projects Overview
              </h2>
              <Link href="/projects" className="text-sm font-medium text-brand-600">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-2">Project Name</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">End Date</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 8).map((row) => {
                    const label = bucketStatus(row.status);
                    return (
                      <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white/90">
                          {row.name}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge size="sm" color={statusColor(label)}>
                            {label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                          {row.address || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                          {row.endDate ? formatDate(row.endDate) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link href="/projects" className="text-sm font-medium text-brand-600">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && !projects.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No projects yet. Add your first project.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Customer Issues</h2>
              <Link href="/customer-issues" className="text-sm font-medium text-brand-600">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-2">Project</th>
                    <th className="px-4 py-2">Issue</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.slice(0, 5).map((row) => {
                    const key = String(row.status || "OPEN").toUpperCase();
                    const label =
                      key === "RESOLVED" || key === "CLOSED"
                        ? "Resolved"
                        : key === "IN_PROGRESS" || key === "ASSIGNED"
                          ? "In Progress"
                          : "Open";
                    return (
                      <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                          {row.project?.name || "—"}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white/90">
                          {row.subject || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            size="sm"
                            color={
                              label === "Resolved"
                                ? "success"
                                : label === "In Progress"
                                  ? "warning"
                                  : "error"
                            }
                          >
                            {label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && !issues.length ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                        No customer issues yet. Raise one from Customer Issue when a site problem
                        comes up.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Documents</h2>
              <Link href="/documents" className="text-sm font-medium text-brand-600">
                View All
              </Link>
            </div>
            <p className="px-4 pb-4 text-sm text-gray-400">
              Shared drawings, agreements, and ID proofs will appear here.
            </p>
          </div>
        </div>

        <aside className="space-y-5">
          <div className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Chat Box</h2>
              <Link href="/chat" className="text-xs text-gray-400">
                •••
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Chat with the Santoshi Interior team, project managers, and support from here.
            </p>
            <Link href="/chat" className="mt-4 inline-flex w-full">
              <Button size="sm" className="w-full">
                Go to Chat Box
              </Button>
            </Link>
          </div>

          <div className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Payments Summary
              </h2>
              <Link href="/payments" className="text-xs font-medium text-brand-600">
                View All
              </Link>
            </div>
            <p className="text-xs text-gray-500">Total Earnings</p>
            <p className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {formatINR(earnings.total)}
            </p>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                Received <span className="float-right font-medium text-success-600">{formatINR(earnings.received)}</span>
              </p>
              <p>
                Pending <span className="float-right font-medium text-error-500">{formatINR(earnings.pending)}</span>
              </p>
            </div>
            <Link href="/payments" className="mt-4 inline-flex w-full">
              <Button size="sm" className="w-full">
                View Payments
              </Button>
            </Link>
          </div>

          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">DLP Payment</h2>
            <p className="mt-2 text-sm text-gray-500">
              Delay in Payments settled by the company for your assigned projects.
            </p>
            <p className="mt-3 text-lg font-semibold text-error-500">{formatINR(dlpPending)}</p>
            <Link href="/dlp-payment" className="mt-3 inline-flex w-full">
              <Button size="sm" variant="outline" className="w-full">
                Pay Now
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
