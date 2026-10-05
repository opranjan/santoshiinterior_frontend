"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
  AlertIcon,
  BoxCubeIcon,
  ChatIcon,
  DollarLineIcon,
  DocsIcon,
  FileIcon,
  FolderIcon,
  PencilIcon,
} from "@/icons";
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
};

type IssueRow = {
  id: string;
  subject?: string | null;
  status?: string | null;
  project?: { name?: string | null } | null;
};

type DocRow = {
  id: string;
  fileName?: string | null;
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

function issueLabel(status?: string | null) {
  const key = String(status || "OPEN").toUpperCase();
  if (key === "RESOLVED" || key === "CLOSED") return "Resolved";
  if (key === "IN_PROGRESS" || key === "ASSIGNED") return "In Progress";
  return "Open";
}

const QUICK_ACTIONS = [
  { label: "Projects", hint: "Assigned sites & progress", href: "/projects", Icon: FolderIcon },
  { label: "Design", hint: "Open design studio", href: "/design/designing", Icon: PencilIcon },
  { label: "Procurement", hint: "Requests and orders", href: "/operations/procurement/requests", Icon: BoxCubeIcon },
  { label: "Payments", hint: "Vendor payouts", href: "/payments", Icon: DollarLineIcon },
  { label: "Chat Box", hint: "Message the company", href: "/chat", Icon: ChatIcon },
  { label: "DLP Payment", hint: "View holding balance", href: "/dlp-payment", Icon: DocsIcon },
  { label: "Customer Issue", hint: "Raise a site issue", href: "/customer-issues", Icon: AlertIcon },
  { label: "Documents", hint: "Drawings and files", href: "/documents", Icon: FileIcon },
];

export default function FranchiseeDashboardHome() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [dlpPayments, setDlpPayments] = useState<PaymentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRes, paymentRes, dlpRes, issueRes, fileRes] = await Promise.all([
          projectsApi.list({ limit: 8 }),
          paymentsApi.list({ limit: 50 }).catch(() => ({ items: [] })),
          paymentsApi.list({ limit: 50, type: "DLP" }).catch(() => ({ items: [] })),
          warrantyApi.list({ limit: 8 }).catch(() => ({ items: [] })),
          projectsApi.listFiles({ limit: 8 }).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setProjects((projectRes.items || []) as ProjectRow[]);
        setPayments((paymentRes.items || []) as PaymentRow[]);
        setDlpPayments((dlpRes.items || []) as PaymentRow[]);
        setIssues((issueRes.items || []) as IssueRow[]);
        setDocs((fileRes.items || []) as DocRow[]);
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
    const received = payments
      .filter((row) => String(row.status || "").toUpperCase() === "PAID")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pending = payments
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
      : /electric/i.test(category)
        ? "Electrical works"
        : /plumb/i.test(category)
          ? "Plumbing works"
          : "Wood Work & Carpentry";

  const kpis = [
    { label: "Total Projects", value: loading ? "—" : counts.total, tone: "text-[#9a7748]", href: "/projects" },
    { label: "Completed", value: loading ? "—" : counts.completed, tone: "text-success-600", href: "/projects" },
    { label: "Ongoing", value: loading ? "—" : counts.ongoing, tone: "text-warning-600", href: "/projects" },
    { label: "Pending", value: loading ? "—" : counts.pending, tone: "text-error-600", href: "/projects" },
  ];

  const paidPct = earnings.total > 0 ? Math.round((earnings.received / earnings.total) * 100) : 0;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-5 pb-6">
      <section className="vendor-card vendor-rise overflow-hidden">
        <div className="flex flex-col bg-black lg:h-36 lg:flex-row lg:items-stretch">
          <div className="flex h-36 w-full items-center justify-center bg-black lg:w-36 lg:shrink-0">
            <img
              src="/images/logo/santoshi-interiors.jpg"
              alt="Santoshi Interiors"
              className="h-full w-auto max-w-full object-contain"
            />
          </div>
          <div className="flex flex-1 flex-col justify-center border-t border-white/10 px-6 py-4 lg:border-l lg:border-t-0 lg:px-8 lg:py-0">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#c4a574]">Vendor panel · {today}</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight text-[#f7f3ea] md:text-4xl">
              Welcome back, {firstName(user?.name)}!
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#d8d0c3]">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((kpi, index) => (
              <Link
                key={kpi.label}
                href={kpi.href}
                className={`vendor-card dash-kpi vendor-rise vendor-rise-delay-${index + 1} p-5`}
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">{kpi.label}</p>
                <p className={`vendor-serif mt-2 text-3xl ${kpi.tone}`}>{kpi.value}</p>
                <p className="mt-3 text-xs font-medium text-[#9a7748]">View all</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="vendor-card vendor-rise p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">My Category</p>
              <div className="vendor-gold-rule mt-2" />
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4efe6] text-lg">🔨</span>
                <div>
                  <p className="vendor-serif text-2xl text-[#111]">{category}</p>
                  <p className="text-xs text-[#8a8175]">{tradeHint}</p>
                </div>
              </div>
              <Link
                href="/profile"
                className="mt-4 inline-flex border border-[#e4d9c8] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[#9a7748] transition hover:border-[#c4a574] hover:bg-[#c4a574] hover:text-black"
              >
                View Category Details
              </Link>
            </div>

            <div className="vendor-card vendor-rise p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Earnings Overview</p>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8175]">This Month</span>
              </div>
              <div className="vendor-gold-rule mt-2" />
              <p className="mt-3 text-xs text-[#8a8175]">Total Earnings</p>
              <p className="vendor-serif mt-1 text-3xl text-[#111]">
                {loading ? "—" : formatINR(earnings.total)}
              </p>
              <div className="mt-3 h-1 overflow-hidden bg-[#e4d9c8] dark:bg-white/10">
                <div className="h-full bg-[#c4a574] transition-all duration-700" style={{ width: `${Math.max(paidPct, 3)}%` }} />
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-[#8a8175]">Received</p>
                  <p className="font-semibold text-success-600">{formatINR(earnings.received)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8a8175]">Pending</p>
                  <p className="font-semibold text-error-500">{formatINR(earnings.pending)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="vendor-card vendor-rise px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Quick Actions</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.Icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    title={action.hint}
                    className="group flex items-center gap-2.5 rounded-xl border border-[#eee6d8] bg-[#fbf8f2] px-2.5 py-2 transition hover:border-[#c4a574] hover:bg-[#111] dark:border-[var(--vendor-line)] dark:bg-black/20"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111] text-[#c4a574] group-hover:bg-[#c4a574] group-hover:text-[#111]">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-[13px] font-semibold leading-tight text-[#111] group-hover:text-[#f7f3ea]">
                        {action.label}
                      </span>
                      <span className="mt-0.5 hidden truncate text-[10px] text-[#8a8175] group-hover:text-[#d4c8b8] sm:block">
                        {action.hint}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="vendor-card vendor-rise overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Assigned work</p>
                <h2 className="vendor-serif mt-1 text-2xl text-[#111]">Projects Overview</h2>
              </div>
              <Link href="/projects" className="text-xs uppercase tracking-[0.16em] text-[#9a7748]">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#fbf8f2] text-left text-[11px] uppercase tracking-[0.14em] text-[#9a7748] dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-5 py-2.5">Project Name</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Location</th>
                    <th className="px-4 py-2.5">End Date</th>
                    <th className="px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((row) => {
                    const label = bucketStatus(row.status);
                    return (
                      <tr key={row.id} className="border-t border-[#eee6d8] dark:border-[var(--vendor-line)]">
                        <td className="px-5 py-3 font-medium text-[#111]">{row.name}</td>
                        <td className="px-4 py-3">
                          <Badge size="sm" color={statusColor(label)}>
                            {label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[#6b645b]">{row.address || "—"}</td>
                        <td className="px-4 py-3 text-[#6b645b]">
                          {row.endDate ? formatDate(row.endDate) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link href="/projects" className="text-xs uppercase tracking-[0.14em] text-[#9a7748]">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && !projects.length ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[#8a8175]">
                        No projects assigned yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="vendor-card vendor-rise overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="vendor-serif text-2xl text-[#111]">Customer Issues</h2>
              <Link href="/customer-issues" className="text-xs uppercase tracking-[0.16em] text-[#9a7748]">
                View All
              </Link>
            </div>
            {issues.length ? (
              <div className="divide-y divide-[#eee6d8] dark:divide-[var(--vendor-line)]">
                {issues.slice(0, 5).map((row) => (
                  <Link
                    key={row.id}
                    href="/customer-issues"
                    className="flex items-center justify-between px-5 py-3 text-sm hover:bg-[#fbf8f2] dark:hover:bg-white/[0.02]"
                  >
                    <span>
                      <span className="font-medium text-[#111]">{row.subject || "Issue"}</span>
                      <span className="ml-2 text-xs text-[#8a8175]">{row.project?.name || ""}</span>
                    </span>
                    <Badge size="sm" color="light">
                      {issueLabel(row.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-[#8a8175]">
                No customer issues yet. Raise one from Customer Issue when a site problem comes up.
              </p>
            )}
          </div>

          <div className="vendor-card vendor-rise overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="vendor-serif text-2xl text-[#111]">Documents</h2>
              <Link href="/documents" className="text-xs uppercase tracking-[0.16em] text-[#9a7748]">
                View All
              </Link>
            </div>
            {docs.length ? (
              <div className="divide-y divide-[#eee6d8] dark:divide-[var(--vendor-line)]">
                {docs.slice(0, 5).map((row) => (
                  <p key={row.id} className="px-5 py-3 text-sm text-[#111]">
                    {row.fileName || "File"}
                    {row.project?.name ? <span className="ml-2 text-xs text-[#8a8175]">{row.project.name}</span> : null}
                  </p>
                ))}
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-[#8a8175]">
                Shared drawings, agreements, and ID proofs will appear here.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="vendor-card vendor-rise p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Support</p>
            <div className="mb-3 mt-1 flex items-center justify-between">
              <h2 className="vendor-serif text-2xl text-[#111]">Chat Box</h2>
              <Link href="/chat" className="text-xs text-[#c4a574]">
                •••
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-[#6b645b]">
              Message the Santoshi Interior CRM team. Replies show here in Chat Box.
            </p>
            <Link href="/chat" className="mt-4 inline-flex w-full">
              <Button size="sm" className="w-full">
                Go to Chat Box
              </Button>
            </Link>
          </div>

          <div className="vendor-card vendor-rise p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="vendor-serif text-2xl text-[#111]">Payments Summary</h2>
              <Link href="/payments" className="text-[10px] uppercase tracking-[0.14em] text-[#9a7748]">
                View All
              </Link>
            </div>
            <p className="text-xs text-[#8a8175]">Total Earnings</p>
            <p className="vendor-serif text-2xl text-[#111]">{formatINR(earnings.total)}</p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex justify-between text-[#6b645b]">
                Received <span className="font-medium text-success-600">{formatINR(earnings.received)}</span>
              </p>
              <p className="flex justify-between text-[#6b645b]">
                Pending <span className="font-medium text-error-500">{formatINR(earnings.pending)}</span>
              </p>
            </div>
            <Link href="/payments" className="mt-4 inline-flex w-full">
              <Button size="sm" className="w-full">
                View Payments
              </Button>
            </Link>
          </div>

          <div className="vendor-card vendor-rise p-5">
            <h2 className="vendor-serif text-2xl text-[#111]">DLP Payment</h2>
            <p className="mt-2 text-sm text-[#6b645b]">
              DLP is holding from your project value. Example: 100 with 20% holding → ₹20 here, remaining in Payments.
            </p>
            <p className="vendor-serif mt-3 text-2xl text-error-500">{loading ? "—" : formatINR(dlpPending)}</p>
            <Link href="/dlp-payment" className="mt-3 inline-flex w-full">
              <Button size="sm" variant="outline" className="w-full">
                Open DLP
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
