"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import { metaLeadAdsApi, type MetaAdsAdDto } from "@/services/crmApi";

export default function MetaAdsCreatives() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MetaAdsAdDto[]>([]);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await metaLeadAdsApi.listAds({ search: query || undefined });
      setItems(data.items || []);
      setMetaError(data.metaError || null);
      setAdAccountId(data.adAccountId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ads");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MetaAdsShell title="Ads & Creatives" subtitle="Live ads from your Meta ad account">
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
          placeholder="Search ads…"
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
              No ads yet. Publish a lead ad from Create Campaign.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Ad</th>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Ad set</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.thumbnailUrl}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-xs font-semibold text-orange-600">
                              Ad
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{row.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{row.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.campaignName || row.campaignId || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.adsetName || row.adsetId || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold">
                          {row.status || "—"}
                        </span>
                      </td>
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
