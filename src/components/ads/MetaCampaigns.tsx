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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createName, setCreateName] = useState("");
  const [createObjective, setCreateObjective] = useState("OUTCOME_LEADS");
  const [createStatus, setCreateStatus] = useState<"PAUSED" | "ACTIVE">("PAUSED");

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

  const loadDetail = useCallback(async (key: string) => {
    if (!key) {
      setCampaign(null);
      setLeads([]);
      setLeadsTotal(0);
      return;
    }
    try {
      setDetailLoading(true);
      setDetailError("");
      const data = await metaLeadAdsApi.getCampaign(key, { limit: 50 });
      setCampaign(data.campaign);
      setLeads(data.leads?.items || []);
      setLeadsTotal(data.leads?.total || 0);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Could not load campaign");
      setCampaign(null);
      setLeads([]);
      setLeadsTotal(0);
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

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateError("");
      const created = await metaLeadAdsApi.createCampaign({
        name: createName.trim(),
        objective: createObjective,
        status: createStatus,
        specialAdCategories: [],
      });
      setShowCreate(false);
      setCreateName("");
      setCreateObjective("OUTCOME_LEADS");
      setCreateStatus("PAUSED");
      await loadList();
      if (created?.key) selectCampaign(created.key);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create campaign");
    } finally {
      setCreating(false);
    }
  };

  return (
    <MetaAdsShell
      title="Campaigns"
      subtitle="Meta ad campaigns with lead counts from CRM. Meta Ads Manager data shows when the ad account token is connected."
    >
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
            className="h-11 min-w-[220px] flex-1 rounded-xl border border-[#eadfcf] bg-white px-3.5 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          >
            Search
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setCreateError("");
            setShowCreate(true);
          }}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
        >
          Create campaign
        </button>
      </div>

      {showCreate ? (
        <form
          onSubmit={(e) => void createCampaign(e)}
          className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                Create Meta campaign
              </h2>
              <p className="mt-1 text-xs text-[#8a7b68]">
                Creates a campaign in Ads Manager for ad account{" "}
                {adAccountId ? `act_${adAccountId}` : "(set META_ADS_AD_ACCOUNT_ID)"}. Starts{" "}
                {createStatus === "PAUSED" ? "paused" : "active"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68]"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                Name
              </label>
              <input
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Goa Lead Ads — March"
                className="h-11 w-full rounded-xl border border-[#eadfcf] bg-white px-3.5 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                Objective
              </label>
              <select
                value={createObjective}
                onChange={(e) => setCreateObjective(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                <option value="OUTCOME_LEADS">Leads</option>
                <option value="OUTCOME_TRAFFIC">Traffic</option>
                <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                <option value="OUTCOME_AWARENESS">Awareness</option>
                <option value="OUTCOME_SALES">Sales</option>
                <option value="OUTCOME_APP_PROMOTION">App promotion</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                Status
              </label>
              <select
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as "PAUSED" | "ACTIVE")}
                className="h-11 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                <option value="PAUSED">Paused</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating || !createName.trim()}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create on Meta"}
              </button>
            </div>
          </div>
          {createError ? <p className="mt-3 text-sm text-error-600">{createError}</p> : null}
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs text-[#8a7b68]">
        {adAccountId ? <span>Ad account: act_{adAccountId}</span> : <span>Ad account not set</span>}
        {fromMeta ? <span>· Meta campaigns loaded</span> : null}
        {metaError ? <span className="text-amber-700">· Meta: {metaError}</span> : null}
      </div>

      {loading ? <TableSkeleton rows={6} /> : null}
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#1a1714]">
            <div className="border-b border-[#eadfcf] px-4 py-3 text-sm text-[#8a7b68] dark:border-[#3a342c]">
              {items.length} campaign{items.length === 1 ? "" : "s"}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#8a7b68]">
                No campaigns yet. Meta Lead Ads and Facebook/Instagram leads will group here by campaign.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eadfcf] text-[10px] uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c]">
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
                          className={`cursor-pointer border-b border-[#f0e8da] dark:border-[#2a251f] ${
                            active ? "bg-[#fbf8f3] dark:bg-[#161411]" : "hover:bg-[#fbf8f3]/70 dark:hover:bg-[#161411]/70"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                              {row.campaignName}
                            </p>
                            <p className="text-xs text-[#8a7b68]">
                              {row.campaignId || "No Meta campaign id"}
                              {row.objective ? ` · ${row.objective}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[#6b645b]">{row.leadCount}</td>
                          <td className="px-4 py-3 text-[#6b645b]">
                            {row.metaStatus || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#8a7b68]">{sourceLabel(row.source)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#1a1714]">
            {!selectedKey ? (
              <p className="text-sm text-[#8a7b68]">Select a campaign to see leads and details.</p>
            ) : detailLoading ? (
              <TableSkeleton rows={5} cols={3} />
            ) : detailError ? (
              <p className="text-sm text-error-600">{detailError}</p>
            ) : campaign ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                      {campaign.campaignName}
                    </h2>
                    <p className="mt-1 text-xs text-[#8a7b68]">
                      {campaign.campaignId || "No campaign id"} · {sourceLabel(campaign.source)}
                    </p>
                  </div>
                  <Link
                    href={`/ads/meta/leads`}
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:text-[#1c1610]"
                  >
                    All leads
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-[#eadfcf] px-3 py-2 dark:border-[#3a342c]">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a7b68]">Leads</p>
                    <p className="mt-1 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {campaign.leadCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#eadfcf] px-3 py-2 dark:border-[#3a342c]">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a7b68]">Meta status</p>
                    <p className="mt-1 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {campaign.metaStatus || "—"}
                    </p>
                  </div>
                </div>

                {campaign.byStatus?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {campaign.byStatus.map((s) => (
                      <span
                        key={s.status}
                        className="rounded-full bg-[#f6f0e6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b645b]"
                      >
                        {s.status}: {s.count}
                      </span>
                    ))}
                  </div>
                ) : null}

                <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  Leads ({leadsTotal})
                </h3>
                {leads.length === 0 ? (
                  <p className="mt-3 text-sm text-[#8a7b68]">No CRM leads linked to this campaign yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {leads.map((lead) => (
                      <li key={lead.id}>
                        <Link
                          href={`/sales/leads/${lead.id}`}
                          className="block rounded-xl border border-[#eadfcf] px-3 py-2 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-[#161411]"
                        >
                          <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                            {lead.clientName || "—"}
                          </p>
                          <p className="text-xs text-[#8a7b68]">
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
