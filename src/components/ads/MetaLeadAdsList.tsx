"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import {
  metaLeadAdsApi,
  type MetaLeadAdsLeadDto,
  type MetaLeadAdsSyncResultDto,
} from "@/services/crmApi";

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MetaLeadAdsList() {
  const [items, setItems] = useState<MetaLeadAdsLeadDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncResult, setSyncResult] = useState<MetaLeadAdsSyncResultDto | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await metaLeadAdsApi.listLeads({
        search: query || undefined,
        page,
        limit: 30,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Meta leads");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncFromMeta = async () => {
    try {
      setSyncing(true);
      setSyncError("");
      setSyncResult(null);
      const result = await metaLeadAdsApi.syncAll({ limit: 2000 });
      setSyncResult(result);
      setPage(1);
      await load();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Meta sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <MetaAdsShell
      title="Leads"
      subtitle="Instant form submissions from Meta ads, synced into Sales leads."
    >
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-[220px] flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, campaign, leadgen id…"
            className="h-11 min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900"
          >
            Search
          </button>
        </form>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void syncFromMeta()}
          className="inline-flex h-11 items-center rounded-xl bg-orange-600 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
        >
          {syncing ? "Fetching…" : "Fetch from Meta"}
        </button>
        <Link
          href="/ads/meta/campaigns"
          className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900"
        >
          Campaigns
        </Link>
      </div>

      {syncError ? <p className="text-sm text-red-600">{syncError}</p> : null}
      {syncResult ? (
        <p className="text-sm text-slate-600">
          Synced {syncResult.scanned} · created {syncResult.created} · merged {syncResult.merged} ·
          duplicates {syncResult.duplicates}
          {syncResult.errors ? ` · errors ${syncResult.errors}` : ""}
        </p>
      ) : null}

      {loading ? <TableSkeleton rows={8} /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">
              {total} lead{total === 1 ? "" : "s"}
            </p>
            <Link
              href="/sales/leads"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
            >
              Open Sales leads
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No Meta Lead Ads matches yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-4 py-3 font-semibold">Lead</th>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/sales/leads/${row.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {row.clientName || "—"}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {row.phone || "—"}
                          {row.email ? ` · ${row.email}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{row.campaignName || "—"}</p>
                        {row.campaignId ? (
                          <p className="text-xs text-slate-500">{row.campaignId}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.source || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.status}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.assignedTo?.name || row.salesOwner?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatWhen(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-40"
              >
                Prev
              </button>
              <p className="text-xs text-slate-500">
                Page {page} / {totalPages}
              </p>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </MetaAdsShell>
  );
}
