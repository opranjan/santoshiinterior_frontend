"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import {
  metaLeadAdsApi,
  type MetaAdsCampaignDto,
  type MetaAdsInsightsDto,
  type MetaAdsOverviewDto,
} from "@/services/crmApi";

function money(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${accent || "text-slate-900"}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MetaAdsOverview() {
  const [overview, setOverview] = useState<MetaAdsOverviewDto | null>(null);
  const [insights, setInsights] = useState<MetaAdsInsightsDto | null>(null);
  const [campaigns, setCampaigns] = useState<MetaAdsCampaignDto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, ins, camps] = await Promise.all([
          metaLeadAdsApi.getOverview(),
          metaLeadAdsApi.getInsights({ datePreset: "last_30d" }).catch(() => null),
          metaLeadAdsApi.listCampaigns().catch(() => ({ items: [] as MetaAdsCampaignDto[] })),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setInsights(ins);
        setCampaigns(camps.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load Meta Ads");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const spend = insights?.meta?.account?.spend ?? null;
  const leads =
    insights?.meta?.account?.leads ??
    overview?.stats.total ??
    null;
  const cpl = insights?.meta?.account?.costPerLead ?? null;
  const activeCampaigns = campaigns.filter((c) => {
    const s = String(c.metaStatus || "").toUpperCase();
    return s === "ACTIVE" || s === "ENABLED";
  }).length;

  const daily = insights?.meta?.daily?.length
    ? insights.meta.daily
    : (insights?.crm?.daily || []).map((d) => ({
        date: d.date,
        leads: d.leads,
        spend: 0,
        impressions: 0,
        clicks: 0,
      }));
  const maxBar = Math.max(1, ...daily.map((d) => Number(d.leads) || Number(d.spend) || 0));
  const recentCampaigns = campaigns.slice(0, 6);

  return (
    <MetaAdsShell>
      {loading ? <TableSkeleton rows={8} /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && overview ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Total Spend" value={money(spend)} hint="Last 30 days (Meta)" />
              <Kpi
                label="Total Leads"
                value={leads != null ? String(leads) : "—"}
                hint={`CRM Meta leads: ${overview.stats.total}`}
                accent="text-orange-600"
              />
              <Kpi label="Cost Per Lead" value={money(cpl)} hint="From Meta insights" />
              <Kpi
                label="Active Campaigns"
                value={String(activeCampaigns)}
                hint={`${campaigns.length} total campaigns`}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Performance</h3>
                  <p className="text-xs text-slate-500">Daily leads / spend · last 30 days</p>
                </div>
                <Link
                  href="/ads/meta/insights"
                  className="text-xs font-semibold text-orange-600 hover:underline"
                >
                  Open Analytics
                </Link>
              </div>
              {daily.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-500">
                  No performance series yet. Publish a campaign or wait for insights.
                </p>
              ) : (
                <div className="mt-6 flex h-40 items-end gap-1.5 overflow-x-auto pb-1">
                  {daily.slice(-21).map((d, i) => {
                    const v = Number(d.leads) || Number(d.spend) || 0;
                    const h = Math.max(6, Math.round((v / maxBar) * 100));
                    return (
                      <div
                        key={`${d.date || i}`}
                        className="group flex min-w-[14px] flex-1 flex-col items-center justify-end"
                        title={`${d.date || ""} · leads ${d.leads ?? 0}`}
                      >
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-orange-600 to-orange-400 transition group-hover:from-orange-700"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Recent campaigns</h3>
                <Link
                  href="/ads/meta/campaigns"
                  className="text-xs font-semibold text-orange-600 hover:underline"
                >
                  View all
                </Link>
              </div>
              {recentCampaigns.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                  No campaigns yet.{" "}
                  <Link href="/ads/meta/campaigns/new" className="font-semibold text-orange-600">
                    Create your first campaign
                  </Link>
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        <th className="py-2 pr-3 font-semibold">Campaign</th>
                        <th className="py-2 pr-3 font-semibold">Status</th>
                        <th className="py-2 pr-3 font-semibold">Leads</th>
                        <th className="py-2 font-semibold">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCampaigns.map((row) => (
                        <tr key={row.key} className="border-b border-slate-50">
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/ads/meta/campaigns?key=${encodeURIComponent(row.key)}`}
                              className="font-medium text-slate-900 hover:text-orange-600"
                            >
                              {row.campaignName}
                            </Link>
                            <p className="text-xs text-slate-500">{row.objective || "—"}</p>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {row.metaStatus || row.source}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-700">{row.leadCount}</td>
                          <td className="py-2.5 text-slate-500">
                            {formatWhen(row.updatedTime || row.lastLeadAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Recent Lead Ads</h3>
                <Link
                  href="/ads/meta/leads"
                  className="text-xs font-semibold text-orange-600 hover:underline"
                >
                  View all
                </Link>
              </div>
              {overview.recent.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No Instant Form leads in CRM yet. Use Fetch from Meta on the Leads tab after forms
                  start filling.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {overview.recent.slice(0, 5).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <Link
                          href={`/sales/leads/${row.id}`}
                          className="font-medium text-slate-900 hover:text-orange-600"
                        >
                          {row.clientName || "—"}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {row.campaignName || "—"} · {row.status}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">{formatWhen(row.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-100">
                Grow faster
              </p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">
                Launch Instant Form lead ads from CRM
              </h3>
              <p className="mt-2 text-sm text-orange-50">
                5-step wizard creates campaign, ad set, form, creative, and ad on Meta.
              </p>
              <Link
                href="/ads/meta/campaigns/new"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-4 text-xs font-semibold text-orange-700"
              >
                Create Campaign
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
              <ul className="mt-3 space-y-2">
                {[
                  { href: "/ads/meta/campaigns/new", label: "Create Campaign" },
                  { href: "/ads/meta/leads", label: "Import / sync leads" },
                  { href: "/ads/meta/adsets", label: "View Ad Sets" },
                  { href: "/ads/meta/connection", label: "Connection settings" },
                ].map((a) => (
                  <li key={a.href}>
                    <Link
                      href={a.href}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-800 hover:border-orange-200 hover:bg-orange-50"
                    >
                      {a.label}
                      <span className="text-orange-600">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Connection</p>
              <p className="mt-1">
                {overview.connection.configured ? "Configured" : "Needs setup"} · Page{" "}
                {overview.connection.pageId || "—"} · API {overview.connection.apiVersion}
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </MetaAdsShell>
  );
}
