"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import {
  metaLeadAdsApi,
  type MetaAdsOverviewDto,
} from "@/services/crmApi";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-4 dark:border-[#3a342c] dark:bg-[#161411]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl text-[#1c1610] dark:text-[#f3ece2]">
        {value}
      </p>
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
  const [data, setData] = useState<MetaAdsOverviewDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const overview = await metaLeadAdsApi.getOverview();
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Meta Ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <MetaAdsShell
      title="Overview"
      subtitle="Lead Ads from Facebook & Instagram land in Sales. WhatsApp messaging stays on its own webhook."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/ads/meta/campaigns"
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
        >
          Open Campaigns
        </Link>
        <Link
          href="/ads/meta/leads"
          className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        >
          Open Lead Ads
        </Link>
      </div>

      {loading ? <TableSkeleton rows={6} /> : null}
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Total Meta leads" value={data.stats.total} />
            <Stat label="Today" value={data.stats.today} />
            <Stat label="Last 7 days" value={data.stats.week} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                  Connection
                </h2>
                <Link
                  href="/ads/meta/connection"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:text-[#1c1610]"
                >
                  Manage
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    data.connection.enabled
                      ? "bg-[#1c1610] text-[#e8d5b5]"
                      : "bg-[#eadfcf] text-[#8a7b68]"
                  }`}
                >
                  {data.connection.enabled ? "Enabled" : "Disabled"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    data.connection.configured
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-[#eadfcf] text-[#8a7b68]"
                  }`}
                >
                  {data.connection.configured ? "Configured" : "Needs setup"}
                </span>
                <span className="rounded-full bg-[#f6f0e6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b645b]">
                  Field: {data.connection.subscribeField}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#8a7b68]">
                Page ID: {data.connection.pageId || "any"} · API{" "}
                {data.connection.apiVersion}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
              <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                Features
              </h2>
              <ul className="mt-3 space-y-2">
                {data.features.map((feature) => (
                  <li key={feature.key}>
                    <Link
                      href={feature.href}
                      className="flex items-center justify-between rounded-xl border border-[#eadfcf] px-3 py-2.5 text-sm transition hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-[#161411]"
                    >
                      <span className="text-[#1c1610] dark:text-[#f3ece2]">
                        {feature.label}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          feature.ready ? "text-emerald-700" : "text-[#8a7b68]"
                        }`}
                      >
                        {feature.ready ? "Ready" : "Soon"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                Recent Lead Ads
              </h2>
              <Link
                href="/ads/meta/leads"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:text-[#1c1610]"
              >
                View all
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="mt-4 text-sm text-[#8a7b68]">
                {data.connection.configured
                  ? "No Facebook / Instagram / Lead Ads rows yet. New Meta form fills and existing Sales leads with those sources appear here."
                  : "Connection needs a Page access token (META_LEAD_ADS_ACCESS_TOKEN). Until then webhook can verify, but lead form data cannot be fetched from Meta."}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eadfcf] text-[10px] uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
                      <th className="py-2 pr-3 font-semibold">Lead</th>
                      <th className="py-2 pr-3 font-semibold">Campaign</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                      <th className="py-2 font-semibold">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#f0e8da] dark:border-[#2a251f]"
                      >
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/sales/leads/${row.id}`}
                            className="font-medium text-[#1c1610] hover:underline dark:text-[#f3ece2]"
                          >
                            {row.clientName || "—"}
                          </Link>
                          <p className="text-xs text-[#8a7b68]">{row.phone || "—"}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-[#6b645b]">
                          {row.campaignName || "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-[#6b645b]">{row.status}</td>
                        <td className="py-2.5 text-[#8a7b68]">
                          {formatWhen(row.createdAt)}
                        </td>
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
