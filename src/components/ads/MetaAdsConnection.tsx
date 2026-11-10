"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import {
  metaLeadAdsApi,
  type MetaLeadAdsStatusDto,
} from "@/services/crmApi";

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        ok
          ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          : "bg-[#eadfcf] text-[#8a7b68] dark:bg-[#2a251f] dark:text-[#a89880]"
      }`}
    >
      {label}
    </span>
  );
}

export default function MetaAdsConnection() {
  const [status, setStatus] = useState<MetaLeadAdsStatusDto | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const meta = await metaLeadAdsApi.getStatus();
        setStatus(meta);
        if (meta.recommendedWebhookUrl) {
          setWebhookUrl(meta.recommendedWebhookUrl);
        } else if (typeof window !== "undefined") {
          const base = window.location.origin.replace(":3000", ":5000");
          setWebhookUrl(`${base}/api/webhooks/meta-leads`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load connection status");
      }
    })();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <MetaAdsShell
      title="Connection"
      subtitle="Page webhook for leadgen only — separate from WhatsApp so messaging is not affected."
    >
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-6 dark:border-[#3a342c] dark:bg-[#161411]">
        {status ? (
          <div className="flex flex-wrap gap-2">
            <Pill ok={status.enabled} label={status.enabled ? "Enabled" : "Disabled"} />
            <Pill
              ok={status.configured}
              label={status.configured ? "Token + verify ready" : "Not configured"}
            />
            <Pill
              ok={status.hasAccessToken}
              label={status.hasAccessToken ? "Page token set" : "Page token missing"}
            />
            <Pill
              ok={status.hasVerifyToken}
              label={status.hasVerifyToken ? "Verify token set" : "Verify token missing"}
            />
            <Pill
              ok={status.hasAppSecret}
              label={status.hasAppSecret ? "App secret set" : "App secret optional"}
            />
          </div>
        ) : null}

        <div className="mt-6">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
            Webhook URL (Meta App → Webhooks → Page → leadgen)
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              value={webhookUrl}
              disabled
              className="h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex h-11 shrink-0 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8a7b68]">
            Verify token must match <code>META_LEAD_ADS_VERIFY_TOKEN</code>. Subscribe field:{" "}
            <strong>{status?.subscribeField || "leadgen"}</strong>.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#eadfcf] bg-white p-4 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]">
          <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">Backend `.env`</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[#8a7b68]">
            <li>
              <code>META_LEAD_ADS_ACCESS_TOKEN</code> — Page token with{" "}
              <code>leads_retrieval</code>
            </li>
            <li>
              <code>META_LEAD_ADS_VERIFY_TOKEN</code> — webhook verify string
            </li>
            <li>
              <code>META_LEAD_ADS_APP_SECRET</code> — optional signature check
            </li>
            <li>
              <code>META_LEAD_ADS_PAGE_ID</code> — Facebook Page ID
            </li>
            <li>
              <code>META_ADS_AD_ACCOUNT_ID</code> — Ad account ID for Campaigns
              (e.g. <code>1422986572702280</code>)
            </li>
            <li>
              <code>PUBLIC_API_URL</code> — public HTTPS API base
            </li>
          </ul>
        </div>

        <p className="mt-4 text-xs text-[#8a7b68]">
          Full integration notes also live under{" "}
          <Link href="/settings/integrations" className="underline">
            Settings → Integrations
          </Link>
          .
        </p>
      </div>
    </MetaAdsShell>
  );
}
