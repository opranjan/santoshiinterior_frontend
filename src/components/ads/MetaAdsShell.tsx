"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const TABS = [
  { href: "/ads/meta", label: "Overview", exact: true },
  { href: "/ads/meta/leads", label: "Lead Ads" },
  { href: "/ads/meta/campaigns", label: "Campaigns" },
  { href: "/ads/meta/insights", label: "Insights" },
  { href: "/ads/meta/connection", label: "Connection" },
] as const;

export default function MetaAdsShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="vendor-form space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
          Ads · Meta Ads
        </p>
        <h1
          className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm text-[#8a7b68]">{subtitle}</p>
        ) : null}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-[#eadfcf] pb-px dark:border-[#3a342c]">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-[#1c1610] text-[#1c1610] dark:border-[#e8d5b5] dark:text-[#f3ece2]"
                  : "border-transparent text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
