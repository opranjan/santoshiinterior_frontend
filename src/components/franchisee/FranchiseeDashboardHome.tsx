"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { paymentsApi, projectsApi, warrantyApi } from "@/services/crmApi";
import { formatDate } from "@/lib/mappers";
import { designAssetUrl } from "@/lib/designAssets";
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
  url?: string | null;
  kind?: string | null;
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

function isImageDoc(name?: string | null, kind?: string | null) {
  const lower = String(name || "").toLowerCase();
  return kind === "elevation" || /\.(png|jpe?g|webp|gif)$/i.test(lower);
}

function DashIcon({ name }: { name: string }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6 shrink-0",
    "aria-hidden": true,
  };
  switch (name) {
    case "projects":
      return (
        <svg {...props}>
          <path d="M4 8h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
          <path d="M4 8V6a1 1 0 0 1 1-1h5l2 2" />
        </svg>
      );
    case "design":
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
        </svg>
      );
    case "procurement":
      return (
        <svg {...props}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "payments":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 15h2" />
        </svg>
      );
    case "chat":
      return (
        <svg {...props}>
          <path d="M4 12a8 8 0 0 1 8-8h0a8 8 0 0 1 8 8v5a2 2 0 0 1-2 2H9l-5 3v-3a8 8 0 0 1 0-7Z" />
        </svg>
      );
    case "dlp":
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "issues":
      return (
        <svg {...props}>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="m10.3 4.7-7 12A2 2 0 0 0 5 19.5h14a2 2 0 0 0 1.7-2.8l-7-12a2 2 0 0 0-3.4 0Z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5" />
        </svg>
      );
  }
}

const QUICK_ACTIONS = [
  { label: "Projects", hint: "Assigned sites & progress", href: "/projects", icon: "projects" },
  { label: "Design", hint: "Open design studio", href: "/design/designing", icon: "design" },
  { label: "Procurement", hint: "Requests and orders", href: "/operations/procurement/requests", icon: "procurement" },
  { label: "Payments", hint: "Vendor payouts", href: "/payments", icon: "payments" },
  { label: "Chat Box", hint: "Message the company", href: "/chat", icon: "chat" },
  { label: "DLP Payment", hint: "View holding balance", href: "/dlp-payment", icon: "dlp" },
  { label: "Customer Issue", hint: "Raise a site issue", href: "/customer-issues", icon: "issues" },
  { label: "Documents", hint: "Drawings and files", href: "/documents", icon: "docs" },
];

export default function FranchiseeDashboardHome() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [dlpPayments, setDlpPayments] = useState<PaymentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docPreview, setDocPreview] = useState<DocRow | null>(null);
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
    <div className="vendor-dash space-y-4 pb-6 sm:space-y-5">
      <section className="vendor-card vendor-rise overflow-hidden rounded-2xl">
        <div className="relative flex items-center gap-3 overflow-hidden bg-[#111] px-4 py-4 sm:gap-5 sm:px-5 lg:h-36 lg:gap-0 lg:p-0">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#c4a574]/15 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-10 left-16 h-24 w-24 rounded-full bg-[#c4a574]/10 blur-2xl" />
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#c4a574]/40 bg-black sm:h-16 sm:w-16 lg:h-36 lg:w-36 lg:rounded-none lg:border-0">
            <img
              src="/images/logo/santoshi-interiors.jpg"
              alt="Santoshi Interiors"
              className="h-full w-auto max-w-full object-contain"
            />
          </div>
          <div className="relative min-w-0 flex-1 lg:flex lg:h-full lg:flex-col lg:justify-center lg:border-l lg:border-white/10 lg:px-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#c4a574] sm:text-[11px] sm:tracking-[0.32em]">
              Vendor panel · {today}
            </p>
            <h1 className="mt-1 font-serif text-[1.55rem] leading-tight tracking-tight text-[#f7f3ea] sm:text-3xl md:text-4xl">
              Welcome, {firstName(user?.name)}
            </h1>
            <p className="mt-1 hidden max-w-xl text-sm leading-6 text-[#d8d0c3] sm:block">
              Here&apos;s what&apos;s happening with your business today.
            </p>
            <p className="mt-1 text-xs text-[#d8d0c3] sm:hidden">Your work, payouts and studio chat.</p>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {kpis.map((kpi, index) => (
              <Link
                key={kpi.label}
                href={kpi.href}
                className={`vendor-card vendor-kpi vendor-rise vendor-rise-delay-${index + 1} rounded-2xl p-3.5 sm:p-5`}
              >
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9a7748]">{kpi.label}</p>
                <p className={`vendor-serif mt-1.5 text-[1.7rem] leading-none sm:mt-2 sm:text-3xl ${kpi.tone}`}>{kpi.value}</p>
                <p className="mt-2 hidden text-xs font-medium text-[#9a7748] sm:mt-3 sm:block">View all</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <div className="vendor-card vendor-rise p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">My Category</p>
              <div className="vendor-gold-rule mt-2" />
              <div className="mt-4 flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe6] text-lg">🔨</span>
                <div className="min-w-0">
                  <p className="vendor-serif text-xl text-[#111] sm:text-2xl">{category}</p>
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

            <div className="vendor-card vendor-rise p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Earnings Overview</p>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#8a8175]">This Month</span>
              </div>
              <div className="vendor-gold-rule mt-2" />
              <p className="mt-3 text-xs text-[#8a8175]">Total Earnings</p>
              <p className="vendor-serif mt-1 break-all text-2xl text-[#111] sm:text-3xl">
                {loading ? "—" : formatINR(earnings.total)}
              </p>
              <div className="mt-3 h-1 overflow-hidden bg-[#e4d9c8] dark:bg-white/10">
                <div className="h-full bg-[#c4a574] transition-all duration-700" style={{ width: `${Math.max(paidPct, 3)}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
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

          <div className="vendor-card vendor-rise px-3 py-4 sm:px-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Quick Actions</p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-4">
              {QUICK_ACTIONS.map((action) => {
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    title={action.hint}
                    className="vendor-quick group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-[#eee6d8] bg-[#fbf8f2] px-1.5 py-3 text-center sm:flex-row sm:items-center sm:gap-2.5 sm:px-2.5 sm:py-2 sm:text-left"
                  >
                    <span className="vendor-quick-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-9 sm:w-9 sm:rounded-xl">
                      <DashIcon name={action.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="vendor-quick-label block truncate text-[11px] font-semibold leading-tight sm:text-[13px]">
                        {action.label}
                      </span>
                      <span className="vendor-quick-hint mt-0.5 hidden truncate text-[10px] sm:block">
                        {action.hint}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="vendor-card vendor-rise overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Assigned work</p>
                <h2 className="vendor-serif mt-1 text-xl text-[#111] sm:text-2xl">Projects Overview</h2>
              </div>
              <Link href="/projects" className="shrink-0 text-xs uppercase tracking-[0.16em] text-[#9a7748]">
                View All
              </Link>
            </div>
            <div className="space-y-0 md:hidden">
              {projects.map((row) => {
                const label = bucketStatus(row.status);
                return (
                  <Link key={row.id} href="/projects" className="vendor-project-row mx-3 mb-2 block rounded-xl bg-[#fbf8f2] px-3.5 py-3 last:mb-3 dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 font-medium leading-snug text-[#111]">{row.name}</p>
                      <Badge size="sm" color={statusColor(label)}>
                        {label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#6b645b]">{row.address || "—"}</p>
                    <p className="mt-0.5 text-xs text-[#8a8175]">
                      {row.endDate ? formatDate(row.endDate) : "No end date"}
                    </p>
                  </Link>
                );
              })}
              {!loading && !projects.length ? (
                <p className="px-4 py-8 text-center text-sm text-[#8a8175]">No projects assigned yet.</p>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto md:block">
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
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <h2 className="vendor-serif text-xl text-[#111] sm:text-2xl">Customer Issues</h2>
              <Link href="/customer-issues" className="shrink-0 text-xs uppercase tracking-[0.16em] text-[#9a7748]">
                View All
              </Link>
            </div>
            {issues.length ? (
              <div className="divide-y divide-[#eee6d8] dark:divide-[var(--vendor-line)]">
                {issues.slice(0, 5).map((row) => (
                  <Link
                    key={row.id}
                    href="/customer-issues"
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm hover:bg-[#fbf8f2] sm:px-5 dark:hover:bg-white/[0.02]"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-[#111]">{row.subject || "Issue"}</span>
                      <span className="mt-0.5 block text-xs text-[#8a8175] sm:ml-2 sm:mt-0 sm:inline">
                        {row.project?.name || ""}
                      </span>
                    </span>
                    <span className="self-start">
                      <Badge size="sm" color="light">
                        {issueLabel(row.status)}
                      </Badge>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-4 pb-5 text-sm text-[#8a8175] sm:px-5">
                No customer issues yet. Raise one from Customer Issue when a site problem comes up.
              </p>
            )}
          </div>

          <div className="vendor-card vendor-rise overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <h2 className="vendor-serif text-xl text-[#111] sm:text-2xl">Documents</h2>
              <Link href="/documents" className="shrink-0 text-xs uppercase tracking-[0.16em] text-[#9a7748]">
                View All
              </Link>
            </div>
            {docs.length ? (
              <div className="space-y-2 px-3 pb-4">
                {docs.slice(0, 5).map((row) => {
                  const href = designAssetUrl(row.url);
                  const image = isImageDoc(row.fileName, row.kind);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => (href ? setDocPreview(row) : undefined)}
                      className="flex w-full items-center gap-3 rounded-xl bg-[#fbf8f2] px-3 py-2.5 text-left dark:bg-white/[0.03]"
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eadfcf] bg-white">
                        {image && href ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={href} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <DashIcon name="docs" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#111]">{row.fileName || "File"}</span>
                        <span className="mt-0.5 block truncate text-xs text-[#8a8175]">{row.project?.name || ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 pb-5 text-sm text-[#8a8175] sm:px-5">
                Shared drawings, agreements, and ID proofs will appear here.
              </p>
            )}
          </div>
        </div>

        <aside className="min-w-0 space-y-4 sm:space-y-5">
          <Link
            href="/chat"
            className="vendor-card vendor-rise flex items-center gap-3 overflow-hidden rounded-2xl bg-[#111] p-4 text-left sm:block sm:bg-[var(--vendor-paper)] sm:p-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#c4a574] text-[#111] sm:hidden">
              <DashIcon name="chat" />
            </span>
            <span className="min-w-0 sm:hidden">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">Support</span>
              <span className="vendor-serif mt-0.5 block text-xl text-[#f7f3ea]">Chat Box</span>
              <span className="mt-0.5 block text-xs text-[#d8d0c3]">Message the studio team</span>
            </span>
            <span className="hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9a7748]">Support</p>
              <div className="mb-3 mt-1 flex items-center justify-between">
                <h2 className="vendor-serif text-xl text-[#111] sm:text-2xl">Chat Box</h2>
                <span className="text-xs text-[#c4a574]">•••</span>
              </div>
              <p className="text-sm leading-relaxed text-[#6b645b]">
                Message the Santoshi Interior CRM team. Replies show here in Chat Box.
              </p>
              <span className="mt-4 inline-flex w-full">
                <Button size="sm" className="w-full pointer-events-none">
                  Go to Chat Box
                </Button>
              </span>
            </span>
          </Link>

          <div className="vendor-card vendor-rise p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="vendor-serif text-xl text-[#111] sm:text-2xl">Payments Summary</h2>
              <Link href="/payments" className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#9a7748]">
                View All
              </Link>
            </div>
            <p className="text-xs text-[#8a8175]">Total Earnings</p>
            <p className="vendor-serif break-all text-2xl text-[#111]">{formatINR(earnings.total)}</p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex justify-between gap-3 text-[#6b645b]">
                Received <span className="font-medium text-success-600">{formatINR(earnings.received)}</span>
              </p>
              <p className="flex justify-between gap-3 text-[#6b645b]">
                Pending <span className="font-medium text-error-500">{formatINR(earnings.pending)}</span>
              </p>
            </div>
            <Link href="/payments" className="mt-4 inline-flex w-full">
              <Button size="sm" className="w-full">
                View Payments
              </Button>
            </Link>
          </div>

          <div className="vendor-card vendor-rise p-4 sm:p-5">
            <h2 className="vendor-serif text-xl text-[#111] sm:text-2xl">DLP Payment</h2>
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

      {docPreview ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDocPreview(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="truncate px-1 pb-2 text-sm font-medium text-[#111]">{docPreview.fileName}</p>
            {isImageDoc(docPreview.fileName, docPreview.kind) && designAssetUrl(docPreview.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={designAssetUrl(docPreview.url)}
                alt={docPreview.fileName || "Document"}
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
            ) : (
              <a
                href={designAssetUrl(docPreview.url)}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-[#f4efe6] px-4 py-8 text-center text-sm text-[#9a7748]"
              >
                Open file
              </a>
            )}
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-[#111] py-2.5 text-sm text-[#f7f3ea]"
              onClick={() => setDocPreview(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
