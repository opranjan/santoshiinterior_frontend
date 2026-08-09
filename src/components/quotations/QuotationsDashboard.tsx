"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateQuotationModal from "@/components/quotations/CreateQuotationModal";
import MyQuotationsList from "@/components/quotations/MyQuotationsList";
import type { Quotation } from "@/components/quotations/QuotationsTable";
import { quotationsApi } from "@/services/crmApi";
import { mapQuotation } from "@/lib/crmMappers";

type TabId = "summary" | "mine" | "all";
type RangeId = "month" | "3m" | "6m";

const inr = (n: number) =>
  `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function daysBetween(from: string, to = new Date()) {
  const a = new Date(from);
  if (Number.isNaN(a.getTime())) return 0;
  return Math.max(
    0,
    Math.floor((to.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function withinRange(createdAt: string, range: RangeId) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return true;
  const now = new Date();
  const days =
    range === "month" ? 31 : range === "3m" ? 92 : 183;
  return daysBetween(createdAt, now) <= days;
}

function MetricCard({
  title,
  count,
  amount,
  color,
  icon,
}: {
  title: string;
  count: number;
  amount: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
            {count}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
            {inr(amount)}
          </p>
        </div>
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {icon}
        </span>
      </div>
      <div
        className="mt-4 h-1 rounded-full"
        style={{ backgroundColor: `${color}33` }}
      >
        <div
          className="h-1 rounded-full"
          style={{ width: "42%", backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function PipelineCard({
  title,
  color,
  count,
  amount,
  avgDays,
  footer,
}: {
  title: string;
  color: string;
  count: number;
  amount: number;
  avgDays: number;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </p>
      </div>
      <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white/90">
        {count} Quotes
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {inr(amount)}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Avg days in Stage: {avgDays}d
      </p>
      {footer}
    </div>
  );
}

export default function QuotationsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("summary");
  const [range, setRange] = useState<RangeId>("month");
  const [author, setAuthor] = useState("all");
  const [rows, setRows] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<"accepted" | "rejected">(
    "accepted"
  );
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await quotationsApi.list({ page: 1, limit: 200 });
      const mapped = (res.items || []).map((item) =>
        mapQuotation(item as Record<string, unknown>)
      ) as Quotation[];
      setRows(mapped);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
      router.replace("/quotations", { scroll: false });
    }
  }, [searchParams, router]);

  const authors = useMemo(() => {
    const set = new Set(rows.map((r) => r.createdBy).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!withinRange(r.createdAt, range)) return false;
      if (author !== "all" && r.createdBy !== author) return false;
      return true;
    });
  }, [rows, range, author]);

  const metrics = useMemo(() => {
    const total = filtered;
    const converted = filtered.filter((r) => r.status === "Accepted");
    const yet = filtered.filter((r) =>
      ["Draft", "Sent", "Viewed", "Revised"].includes(r.status)
    );
    const discarded = filtered.filter((r) =>
      ["Rejected", "Expired"].includes(r.status)
    );
    const sum = (list: Quotation[]) =>
      list.reduce((s, r) => s + Number(r.amount || 0), 0);
    return {
      total: { count: total.length, amount: sum(total) },
      converted: { count: converted.length, amount: sum(converted) },
      yet: { count: yet.length, amount: sum(yet) },
      discarded: { count: discarded.length, amount: sum(discarded) },
    };
  }, [filtered]);

  const pipeline = useMemo(() => {
    const group = (predicate: (r: Quotation) => boolean) => {
      const list = filtered.filter(predicate);
      const amount = list.reduce((s, r) => s + Number(r.amount || 0), 0);
      const avgDays =
        list.length === 0
          ? 0
          : Math.round(
              list.reduce((s, r) => s + daysBetween(r.createdAt), 0) /
                list.length
            );
      return { count: list.length, amount, avgDays };
    };
    return {
      draft: group((r) => r.status === "Draft"),
      approval: group((r) => r.status === "Revised"),
      negotiation: group((r) => ["Sent", "Viewed"].includes(r.status)),
      accepted: group((r) => r.status === "Accepted"),
      rejected: group((r) => ["Rejected", "Expired"].includes(r.status)),
    };
  }, [filtered]);

  const risk = useMemo(() => {
    const onTrack = filtered.filter((r) => daysBetween(r.createdAt) < 30);
    const attention = filtered.filter((r) => {
      const d = daysBetween(r.createdAt);
      return d >= 30 && d <= 90;
    });
    const atRisk = filtered.filter((r) => daysBetween(r.createdAt) > 90);
    const pack = (list: Quotation[]) => ({
      count: list.length,
      amount: list.reduce((s, r) => s + Number(r.amount || 0), 0),
    });
    return {
      onTrack: pack(onTrack),
      attention: pack(attention),
      atRisk: pack(atRisk),
      stages: [
        {
          name: "Created Quotations",
          onTrack: pack(
            filtered.filter(
              (r) =>
                ["Draft", "Sent", "Viewed", "Revised"].includes(r.status) &&
                daysBetween(r.createdAt) < 30
            )
          ),
          attention: pack(
            filtered.filter((r) => {
              const d = daysBetween(r.createdAt);
              return (
                ["Draft", "Sent", "Viewed", "Revised"].includes(r.status) &&
                d >= 30 &&
                d <= 90
              );
            })
          ),
          atRisk: pack(
            filtered.filter(
              (r) =>
                ["Draft", "Sent", "Viewed", "Revised"].includes(r.status) &&
                daysBetween(r.createdAt) > 90
            )
          ),
        },
        {
          name: "Converted",
          onTrack: pack(
            filtered.filter(
              (r) => r.status === "Accepted" && daysBetween(r.createdAt) < 30
            )
          ),
          attention: pack(
            filtered.filter((r) => {
              const d = daysBetween(r.createdAt);
              return r.status === "Accepted" && d >= 30 && d <= 90;
            })
          ),
          atRisk: pack(
            filtered.filter(
              (r) => r.status === "Accepted" && daysBetween(r.createdAt) > 90
            )
          ),
        },
        {
          name: "Discarded",
          onTrack: pack(
            filtered.filter(
              (r) =>
                ["Rejected", "Expired"].includes(r.status) &&
                daysBetween(r.createdAt) < 30
            )
          ),
          attention: pack(
            filtered.filter((r) => {
              const d = daysBetween(r.createdAt);
              return (
                ["Rejected", "Expired"].includes(r.status) &&
                d >= 30 &&
                d <= 90
              );
            })
          ),
          atRisk: pack(
            filtered.filter(
              (r) =>
                ["Rejected", "Expired"].includes(r.status) &&
                daysBetween(r.createdAt) > 90
            )
          ),
        },
      ],
    };
  }, [filtered]);

  const clientStage =
    clientFilter === "accepted" ? pipeline.accepted : pipeline.rejected;

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
            Quotations
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-5 border-b border-gray-200 dark:border-gray-800">
            {(
              [
                {
                  id: "summary",
                  label: "Summary",
                  color: "#22c55e",
                  underline: "bg-[#E85D75]",
                  icon: (
                    <path
                      d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ),
                },
                {
                  id: "mine",
                  label: "My Quotations",
                  color: "#f97316",
                  underline: "bg-orange-500",
                  icon: (
                    <path
                      d="M4 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  ),
                },
                {
                  id: "all",
                  label: "All Quotations",
                  color: "#3b82f6",
                  underline: "bg-blue-500",
                  icon: (
                    <path
                      d="M4 7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  ),
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative -mb-px inline-flex items-center gap-2 pb-3 text-sm font-medium transition ${
                  tab === t.id
                    ? t.id === "mine"
                      ? "text-orange-600"
                      : t.id === "all"
                        ? "text-blue-600"
                        : "text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span style={{ color: t.color }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    {t.icon}
                  </svg>
                </span>
                {t.label}
                {tab === t.id && (
                  <span className={`absolute inset-x-0 bottom-0 h-0.5 ${t.underline}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === "summary" && (
          <div className="flex flex-wrap items-center gap-2 lg:pt-1">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700"
              aria-label="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 12a8 8 0 10-2.3 5.5M20 12V6m0 6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {(
                [
                  { id: "month", label: "This Month" },
                  { id: "3m", label: "3 Months" },
                  { id: "6m", label: "6 Months" },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={`h-10 px-3 text-sm font-medium ${
                    range === r.id
                      ? "bg-[#E85D75]/10 text-[#E85D75]"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="h-10 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="all">All Authors</option>
                {authors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d94c65]"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {tab === "mine" || tab === "all" ? (
        <MyQuotationsList
          rows={rows}
          loading={loading}
          mode={tab}
          onRefresh={() => void load()}
        />
      ) : (
        <>
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
              Loading summary…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Quotation Created"
                  count={metrics.total.count}
                  amount={metrics.total.amount}
                  color="#3b82f6"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M14 3v5h5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  }
                />
                <MetricCard
                  title="Quotes Converted"
                  count={metrics.converted.count}
                  amount={metrics.converted.amount}
                  color="#22c55e"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M8 12l2.5 2.5L16 9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
                <MetricCard
                  title="Yet to Convert"
                  count={metrics.yet.count}
                  amount={metrics.yet.amount}
                  color="#f97316"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 3h12M6 21h12M8 3c0 5 3 6 3 9s-3 4-3 9M16 3c0 5-3 6-3 9s3 4 3 9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
                <MetricCard
                  title="Discarded Quotations"
                  count={metrics.discarded.count}
                  amount={metrics.discarded.amount}
                  color="#ef4444"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M8 12h8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
              </div>

              <div>
                <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white/90">
                  Pipeline summary
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <PipelineCard
                    title="Draft Quotation"
                    color="#3b82f6"
                    count={pipeline.draft.count}
                    amount={pipeline.draft.amount}
                    avgDays={pipeline.draft.avgDays}
                  />
                  <PipelineCard
                    title="Internal Approval"
                    color="#f97316"
                    count={pipeline.approval.count}
                    amount={pipeline.approval.amount}
                    avgDays={pipeline.approval.avgDays}
                  />
                  <PipelineCard
                    title="Under Negotiation"
                    color="#a855f7"
                    count={pipeline.negotiation.count}
                    amount={pipeline.negotiation.amount}
                    avgDays={pipeline.negotiation.avgDays}
                  />
                  <PipelineCard
                    title="Client"
                    color="#60a5fa"
                    count={clientStage.count}
                    amount={clientStage.amount}
                    avgDays={clientStage.avgDays}
                    footer={
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setClientFilter("accepted")}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            clientFilter === "accepted"
                              ? "bg-[#E85D75] text-white"
                              : "border border-gray-200 text-gray-600"
                          }`}
                        >
                          Accepted
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientFilter("rejected")}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            clientFilter === "rejected"
                              ? "bg-[#E85D75] text-white"
                              : "border border-gray-200 text-gray-600"
                          }`}
                        >
                          Rejected
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    Quotation Value Distribution
                  </h3>
                  <div className="mt-8 flex min-h-[220px] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 3a9 9 0 109 9h-9V3z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M13 3.2A9 9 0 0120.8 11H13V3.2z"
                          fill="currentColor"
                          opacity="0.25"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {metrics.total.count} Quotes
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {inr(metrics.total.amount)} total value
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    Revenue Risk Analysis
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                      [
                        {
                          label: "On Track (< 1 mon)",
                          color: "#3b82f6",
                          data: risk.onTrack,
                        },
                        {
                          label: "Need Attention (1 - 3 mon)",
                          color: "#f97316",
                          data: risk.attention,
                        },
                        {
                          label: "At Risk (> 3 mon)",
                          color: "#ef4444",
                          data: risk.atRisk,
                        },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-gray-100 p-3 dark:border-white/[0.06]"
                      >
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p
                          className="mt-1 text-sm font-semibold"
                          style={{ color: item.color }}
                        >
                          {inr(item.data.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.data.count} Quotations
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-500 dark:border-white/[0.06]">
                          <th className="px-2 py-2 font-medium">Stage</th>
                          <th className="px-2 py-2 font-medium">On Track</th>
                          <th className="px-2 py-2 font-medium">
                            Need Attention
                          </th>
                          <th className="px-2 py-2 font-medium">At Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {risk.stages.map((stage) => (
                          <tr
                            key={stage.name}
                            className="border-b border-gray-50 dark:border-white/[0.04]"
                          >
                            <td className="px-2 py-2.5 text-gray-800 dark:text-gray-200">
                              {stage.name}
                            </td>
                            <td className="px-2 py-2.5 text-blue-600">
                              {stage.onTrack.count} · {inr(stage.onTrack.amount)}
                            </td>
                            <td className="px-2 py-2.5 text-orange-500">
                              {stage.attention.count} ·{" "}
                              {inr(stage.attention.amount)}
                            </td>
                            <td className="px-2 py-2.5 text-red-500">
                              {stage.atRisk.count} · {inr(stage.atRisk.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <CreateQuotationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          void load();
          if (id) {
            router.push(`/quotations/${id}`);
            return;
          }
          setTab("mine");
        }}
      />
    </div>
  );
}
