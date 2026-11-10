"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import {
  metaLeadAdsApi,
  type MetaLeadAdsLeadDto,
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

  return (
    <MetaAdsShell
      title="Lead Ads"
      subtitle="Instant form submissions from Meta ads, synced into Sales leads."
    >
      <form
        className="flex flex-wrap gap-2"
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
          className="h-11 min-w-[220px] flex-1 rounded-xl border border-[#eadfcf] bg-white px-3.5 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
        >
          Search
        </button>
      </form>

      {loading ? <TableSkeleton rows={8} /> : null}
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#1a1714]">
          <div className="flex items-center justify-between gap-3 border-b border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
            <p className="text-sm text-[#8a7b68]">
              {total} lead{total === 1 ? "" : "s"}
            </p>
            <Link
              href="/sales/leads"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:text-[#1c1610]"
            >
              Open Sales leads
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a7b68]">
              No Meta Lead Ads matches yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eadfcf] text-[10px] uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
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
                    <tr
                      key={row.id}
                      className="border-b border-[#f0e8da] dark:border-[#2a251f]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/sales/leads/${row.id}`}
                          className="font-medium text-[#1c1610] hover:underline dark:text-[#f3ece2]"
                        >
                          {row.clientName || "—"}
                        </Link>
                        <p className="text-xs text-[#8a7b68]">
                          {row.phone || "—"}
                          {row.email ? ` · ${row.email}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#6b645b]">
                        <p>{row.campaignName || "—"}</p>
                        {row.campaignId ? (
                          <p className="text-xs text-[#8a7b68]">{row.campaignId}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[#6b645b]">{row.source || "—"}</td>
                      <td className="px-4 py-3 text-[#6b645b]">{row.status}</td>
                      <td className="px-4 py-3 text-[#6b645b]">
                        {row.assignedTo?.name || row.salesOwner?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-[#8a7b68]">
                        {formatWhen(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-[#eadfcf] px-4 py-3 dark:border-[#3a342c]">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#eadfcf] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-40 dark:border-[#3a342c]"
              >
                Prev
              </button>
              <p className="text-xs text-[#8a7b68]">
                Page {page} / {totalPages}
              </p>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-[#eadfcf] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-40 dark:border-[#3a342c]"
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
