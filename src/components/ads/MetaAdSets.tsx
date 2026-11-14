"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import { metaLeadAdsApi, type MetaAdsAdSetDto } from "@/services/crmApi";

function moneyMinor(raw?: string | null) {
  if (raw == null || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `₹${(n / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function MetaAdSets() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MetaAdsAdSetDto[]>([]);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await metaLeadAdsApi.listAdSets({ search: query || undefined });
      setItems(data.items || []);
      setMetaError(data.metaError || null);
      setAdAccountId(data.adAccountId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ad sets");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MetaAdsShell title="Ad Sets" subtitle="Live from your Meta ad account">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ad sets…"
          className="h-11 min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700"
        >
          Search
        </button>
        <Link
          href="/ads/meta/campaigns/new"
          className="inline-flex h-11 items-center rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white"
        >
          + Create Campaign
        </Link>
      </form>

      <p className="text-xs text-slate-500">
        {adAccountId ? `Ad account act_${adAccountId}` : "Ad account not set"}
        {metaError ? <span className="text-amber-700"> · {metaError}</span> : null}
      </p>

      {loading ? <TableSkeleton rows={6} /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {items.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              No ad sets yet. Publish a lead ad from Create Campaign.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Ad set</th>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Daily budget</th>
                    <th className="px-4 py-3 font-semibold">Goal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{row.id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.campaignName || row.campaignId || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold">
                          {row.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{moneyMinor(row.dailyBudget)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.optimizationGoal || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </MetaAdsShell>
  );
}
