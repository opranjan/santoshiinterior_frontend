"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import {
  metaLeadAdsApi,
  type MetaAdsInsightsDto,
} from "@/services/crmApi";

const PRESETS = [
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_14d", label: "Last 14 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
] as const;

function money(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function num(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-IN");
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-4 dark:border-[#3a342c] dark:bg-[#161411]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8a7b68]">{hint}</p> : null}
    </div>
  );
}

export default function MetaInsights() {
  const [datePreset, setDatePreset] = useState("last_30d");
  const [data, setData] = useState<MetaAdsInsightsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const insights = await metaLeadAdsApi.getInsights({ datePreset });
      setData(insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load insights");
    } finally {
      setLoading(false);
    }
  }, [datePreset]);

  useEffect(() => {
    void load();
  }, [load]);

  const account = data?.meta?.account;
  const crmTotal = data?.crm?.totalLeads ?? 0;

  return (
    <MetaAdsShell
      title="Insights"
      subtitle="CRM Meta lead volume plus Ads Manager spend, clicks, and cost per lead when the ad account token is connected."
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
          Range
        </label>
        <select
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
          className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        >
          Refresh
        </button>
        <Link
          href="/ads/meta/campaigns"
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
        >
          Campaigns
        </Link>
      </div>

      {loading ? <TableSkeleton rows={8} /> : null}
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {data && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="CRM Meta leads" value={num(crmTotal)} hint="From Sales leads in range" />
            <Stat
              label="Meta spend"
              value={money(account?.spend)}
              hint={data.meta.error ? data.meta.error : "Ads Manager"}
            />
            <Stat label="Meta clicks" value={num(account?.clicks)} hint={`CTR ${pct(account?.ctr)}`} />
            <Stat
              label="Cost / Meta lead"
              value={money(account?.costPerLead)}
              hint={`${num(account?.leads)} Meta-reported leads`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
              <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                CRM leads by status
              </h2>
              {data.crm.byStatus.length === 0 ? (
                <p className="mt-3 text-sm text-[#8a7b68]">No Meta-channel leads in this range.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.crm.byStatus.map((row) => (
                    <li
                      key={row.status}
                      className="flex items-center justify-between rounded-xl border border-[#eadfcf] px-3 py-2 text-sm dark:border-[#3a342c]"
                    >
                      <span className="text-[#6b645b]">{row.status}</span>
                      <span className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
              <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                CRM leads by source
              </h2>
              {data.crm.bySource.length === 0 ? (
                <p className="mt-3 text-sm text-[#8a7b68]">No source breakdown yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.crm.bySource.map((row) => (
                    <li
                      key={row.source}
                      className="flex items-center justify-between rounded-xl border border-[#eadfcf] px-3 py-2 text-sm dark:border-[#3a342c]"
                    >
                      <span className="text-[#6b645b]">{row.source}</span>
                      <span className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#1a1714]">
            <div className="border-b border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
              <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                Campaign performance
              </h2>
              <p className="mt-1 text-xs text-[#8a7b68]">
                Meta spend vs CRM leads
                {data.meta.adAccountId ? ` · act_${data.meta.adAccountId}` : ""}
              </p>
            </div>
            {data.meta.error && !data.meta.campaigns.length ? (
              <p className="px-4 py-8 text-sm text-[#8a7b68]">
                Meta insights unavailable: {data.meta.error}. CRM campaign lead counts still show below.
              </p>
            ) : null}

            {data.meta.campaigns.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eadfcf] text-[10px] uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
                      <th className="px-4 py-3 font-semibold">Campaign</th>
                      <th className="px-4 py-3 font-semibold">Spend</th>
                      <th className="px-4 py-3 font-semibold">Clicks</th>
                      <th className="px-4 py-3 font-semibold">CTR</th>
                      <th className="px-4 py-3 font-semibold">Meta leads</th>
                      <th className="px-4 py-3 font-semibold">CRM leads</th>
                      <th className="px-4 py-3 font-semibold">CPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.meta.campaigns.map((row) => (
                      <tr
                        key={row.campaignId || row.campaignName || Math.random()}
                        className="border-b border-[#f0e8da] dark:border-[#2a251f]"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                            {row.campaignName || "—"}
                          </p>
                          <p className="text-xs text-[#8a7b68]">{row.campaignId || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-[#6b645b]">{money(row.spend)}</td>
                        <td className="px-4 py-3 text-[#6b645b]">{num(row.clicks)}</td>
                        <td className="px-4 py-3 text-[#6b645b]">{pct(row.ctr)}</td>
                        <td className="px-4 py-3 text-[#6b645b]">{num(row.leads)}</td>
                        <td className="px-4 py-3 text-[#6b645b]">{num(row.crmLeads)}</td>
                        <td className="px-4 py-3 text-[#6b645b]">{money(row.costPerLead)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : data.crm.byCampaign.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eadfcf] text-[10px] uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
                      <th className="px-4 py-3 font-semibold">Campaign</th>
                      <th className="px-4 py-3 font-semibold">CRM leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crm.byCampaign.map((row) => (
                      <tr
                        key={row.key}
                        className="border-b border-[#f0e8da] dark:border-[#2a251f]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/ads/meta/campaigns?key=${encodeURIComponent(row.key)}`}
                            className="font-medium text-[#1c1610] hover:underline dark:text-[#f3ece2]"
                          >
                            {row.campaignName}
                          </Link>
                          <p className="text-xs text-[#8a7b68]">{row.campaignId || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-[#6b645b]">{row.leadCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-8 text-sm text-[#8a7b68]">No campaign insight rows for this range.</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
            <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
              Daily CRM leads
            </h2>
            {data.crm.daily.length === 0 ? (
              <p className="mt-3 text-sm text-[#8a7b68]">No daily lead activity in range.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eadfcf] text-[10px] uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 font-semibold">Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crm.daily.map((row) => (
                      <tr key={row.date} className="border-b border-[#f0e8da] dark:border-[#2a251f]">
                        <td className="py-2 pr-3 text-[#6b645b]">{row.date}</td>
                        <td className="py-2 text-[#1c1610] dark:text-[#f3ece2]">{row.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </MetaAdsShell>
  );
}
