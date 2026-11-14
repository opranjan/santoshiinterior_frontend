"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import { TableSkeleton } from "@/components/ui/loader/CrmLoader";
import {
  metaLeadAdsApi,
  type MetaAdsCampaignDto,
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

function sourceLabel(source: MetaAdsCampaignDto["source"]) {
  if (source === "both") return "CRM + Meta";
  if (source === "meta") return "Meta only";
  return "CRM leads";
}

export default function MetaCampaigns() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedKey = searchParams.get("key") || "";

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MetaAdsCampaignDto[]>([]);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [fromMeta, setFromMeta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [campaign, setCampaign] = useState<MetaAdsCampaignDto | null>(null);
  const [leads, setLeads] = useState<MetaLeadAdsLeadDto[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const [isWhatsAppCampaign, setIsWhatsAppCampaign] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [syncingDetail, setSyncingDetail] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await metaLeadAdsApi.listCampaigns({
        search: query || undefined,
      });
      setItems(data.items || []);
      setAdAccountId(data.adAccountId || null);
      setMetaError(data.metaError || null);
      setFromMeta(Boolean(data.fromMeta));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaigns");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDetail = useCallback(async (key: string, opts?: { sync?: boolean }) => {
    if (!key) {
      setCampaign(null);
      setLeads([]);
      setLeadsTotal(0);
      setEmptyReason(null);
      setIsWhatsAppCampaign(false);
      return;
    }
    try {
      setDetailLoading(true);
      setDetailError("");
      const data = await metaLeadAdsApi.getCampaign(key, {
        limit: 50,
        sync: opts?.sync ? "1" : undefined,
      });
      setCampaign(data.campaign);
      setLeads(data.leads?.items || []);
      setLeadsTotal(data.leads?.total || 0);
      setEmptyReason(data.emptyReason || null);
      setIsWhatsAppCampaign(Boolean(data.isWhatsAppCampaign));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Could not load campaign");
      setCampaign(null);
      setLeads([]);
      setLeadsTotal(0);
      setEmptyReason(null);
      setIsWhatsAppCampaign(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadDetail(selectedKey);
  }, [selectedKey, loadDetail]);

  const selectCampaign = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key) params.set("key", key);
    else params.delete("key");
    const qs = params.toString();
    router.push(qs ? `/ads/meta/campaigns?${qs}` : "/ads/meta/campaigns");
  };

  return (
    <MetaAdsShell title="Campaigns" subtitle="Meta campaigns with CRM + Ads Manager lead counts">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-[220px] flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaign name, id, objective…"
            className="h-11 min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700"
          >
            Search
          </button>
        </form>
        <Link
          href="/ads/meta/campaigns/new"
          className="inline-flex h-11 items-center rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white"
        >
          + Create Campaign
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        {adAccountId ? <span>Ad account: act_{adAccountId}</span> : <span>Ad account not set</span>}
        {fromMeta ? <span>· Meta campaigns loaded</span> : null}
        {metaError ? <span className="text-amber-700">· Meta: {metaError}</span> : null}
      </div>

      {loading ? <TableSkeleton rows={6} /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
              {items.length} campaign{items.length === 1 ? "" : "s"}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No campaigns yet.{" "}
                <Link href="/ads/meta/campaigns/new" className="font-semibold text-orange-600">
                  Create your first Instant Form campaign
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-4 py-3 font-semibold">Campaign</th>
                      <th className="px-4 py-3 font-semibold">Leads</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const active = selectedKey === row.key;
                      return (
                        <tr
                          key={row.key}
                          onClick={() => selectCampaign(row.key)}
                          className={`cursor-pointer border-b border-slate-50 ${
                            active ? "bg-orange-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{row.campaignName}</p>
                            <p className="text-xs text-slate-500">
                              {row.campaignId || "No Meta campaign id"}
                              {row.objective ? ` · ${row.objective}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p className="font-medium">{row.leadCount}</p>
                            {row.metaLeadCount != null || row.crmLeadCount != null ? (
                              <p className="text-[11px] text-slate-500">
                                {row.metaLeadCount != null ? `Meta ${row.metaLeadCount}` : null}
                                {row.metaLeadCount != null && row.crmLeadCount != null
                                  ? " · "
                                  : null}
                                {row.crmLeadCount != null ? `CRM ${row.crmLeadCount}` : null}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold">
                              {row.metaStatus || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{sourceLabel(row.source)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedKey ? (
              <p className="text-sm text-slate-500">Select a campaign to see leads and details.</p>
            ) : detailLoading ? (
              <TableSkeleton rows={5} cols={3} />
            ) : detailError ? (
              <p className="text-sm text-red-600">{detailError}</p>
            ) : campaign ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{campaign.campaignName}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {campaign.campaignId || "No campaign id"} · {sourceLabel(campaign.source)}
                    </p>
                  </div>
                  <Link
                    href="/ads/meta/leads"
                    className="text-xs font-semibold text-orange-600 hover:underline"
                  >
                    All leads
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Leads</p>
                    <p className="mt-1 font-medium text-slate-900">{campaign.leadCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      Meta status
                    </p>
                    <p className="mt-1 font-medium text-slate-900">{campaign.metaStatus || "—"}</p>
                  </div>
                </div>

                {campaign.byStatus?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {campaign.byStatus.map((s) => (
                      <span
                        key={s.status}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600"
                      >
                        {s.status}: {s.count}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    CRM leads ({leadsTotal})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {isWhatsAppCampaign ? (
                      <Link
                        href="/communication"
                        className="inline-flex h-8 items-center rounded-lg bg-orange-600 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
                      >
                        Open WhatsApp
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={syncingDetail || detailLoading}
                        onClick={() => {
                          setSyncingDetail(true);
                          void loadDetail(selectedKey, { sync: true }).finally(() =>
                            setSyncingDetail(false)
                          );
                        }}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 disabled:opacity-50"
                      >
                        {syncingDetail ? "Syncing…" : "Import Instant Forms"}
                      </button>
                    )}
                  </div>
                </div>
                {campaign.destinationType ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Destination: {campaign.destinationType}
                    {campaign.callToAction ? ` · ${campaign.callToAction}` : ""}
                  </p>
                ) : null}
                {leads.length === 0 ? (
                  <p className="mt-3 text-sm leading-5 text-slate-500">
                    {emptyReason || "No CRM leads linked to this campaign yet."}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {leads.map((lead) => (
                      <li key={lead.id}>
                        <Link
                          href={`/sales/leads/${lead.id}`}
                          className="block rounded-xl border border-slate-100 px-3 py-2 hover:bg-orange-50"
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {lead.clientName || "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lead.phone || "—"} · {lead.status} · {formatWhen(lead.createdAt)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </MetaAdsShell>
  );
}
