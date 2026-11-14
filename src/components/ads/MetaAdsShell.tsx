"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { metaLeadAdsApi } from "@/services/crmApi";

const TABS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/ads/meta", label: "Overview", exact: true },
  { href: "/ads/meta/campaigns", label: "Campaigns" },
  { href: "/ads/meta/adsets", label: "Ad Sets" },
  { href: "/ads/meta/ads", label: "Ads & Creatives" },
  { href: "/ads/meta/leads", label: "Leads" },
  { href: "/ads/meta/insights", label: "Analytics" },
];

function MetaMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden>
      <circle cx="18" cy="18" r="18" fill="#1877F2" />
      <path
        d="M20.2 29V19.4h3.1l.5-3.5h-3.6v-2.2c0-1 .3-1.7 1.8-1.7H24V9.1c-.5-.1-1.7-.2-3.2-.2-3.2 0-5.3 1.9-5.3 5.5v2.5h-3.5v3.5h3.5V29h4.7z"
        fill="#fff"
      />
    </svg>
  );
}

export default function MetaAdsShell({
  children,
  title,
  subtitle,
  hideCreate,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  hideCreate?: boolean;
}) {
  const pathname = usePathname();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    metaLeadAdsApi
      .getStatus()
      .then((s) => {
        if (!cancelled) setConnected(Boolean(s.configured && s.enabled));
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="meta-ads-manager -mx-1 space-y-5 sm:-mx-0"
      style={
        {
          ["--meta-orange" as string]: "#ea580c",
          ["--meta-orange-hot" as string]: "#f97316",
          ["--meta-ink" as string]: "#0f172a",
          ["--meta-muted" as string]: "#64748b",
          ["--meta-border" as string]: "#e2e8f0",
          ["--meta-soft" as string]: "#f8fafc",
          ["--meta-card" as string]: "#ffffff",
        } as React.CSSProperties
      }
    >
      <header className="rounded-2xl border border-[var(--meta-border)] bg-[var(--meta-card)] px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MetaMark />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--meta-ink)] sm:text-xl">
                  Meta Ads Manager
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    connected
                      ? "bg-emerald-50 text-emerald-700"
                      : connected === false
                        ? "bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      connected ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {connected ? "Meta Connected" : connected === false ? "Setup needed" : "Checking…"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--meta-muted)]">
                Facebook &amp; Instagram Lead Ads
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[var(--meta-muted)] sm:inline-flex" title="Facebook">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
                <path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9c0-.6.4-1 1-1z" />
              </svg>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="#E1306C" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="4" stroke="#E1306C" strokeWidth="1.6" />
                <circle cx="17.2" cy="6.8" r="1" fill="#E1306C" />
              </svg>
            </span>
            <Link
              href="/ads/meta/connection"
              className="inline-flex h-10 items-center rounded-xl border border-[var(--meta-border)] bg-white px-3 text-xs font-semibold text-[var(--meta-muted)] hover:text-[var(--meta-ink)]"
              title="Connection"
            >
              Settings
            </Link>
            {!hideCreate ? (
              <Link
                href="/ads/meta/campaigns/new"
                className="inline-flex h-10 items-center rounded-xl bg-[var(--meta-orange)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--meta-orange-hot)]"
              >
                + Create Campaign
              </Link>
            ) : null}
          </div>
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto border-t border-[var(--meta-border)] pt-3">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-orange-50 text-[var(--meta-orange)]"
                    : "text-[var(--meta-muted)] hover:bg-slate-50 hover:text-[var(--meta-ink)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {(title || subtitle) && (
        <div className="px-0.5">
          {title ? (
            <h2 className="text-base font-semibold text-[var(--meta-ink)]">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-1 max-w-3xl text-sm text-[var(--meta-muted)]">{subtitle}</p>
          ) : null}
        </div>
      )}

      <div className="space-y-5">{children}</div>
    </div>
  );
}
