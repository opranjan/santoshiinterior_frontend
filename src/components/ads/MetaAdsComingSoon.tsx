"use client";

import Link from "next/link";
import React from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";

export default function MetaAdsComingSoon({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <MetaAdsShell title={title} subtitle={blurb}>
      <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f3] px-6 py-12 text-center dark:border-[#3a342c] dark:bg-[#161411]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
          Coming next
        </p>
        <h2
          className="mt-2 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {title} API sync
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#8a7b68]">
          Lead Ads intake is live now. Campaign performance and Insights will plug into the same Meta
          connection without touching WhatsApp.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/ads/meta/leads"
            className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5]"
          >
            Open Lead Ads
          </Link>
          <Link
            href="/ads/meta/connection"
            className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          >
            Connection
          </Link>
        </div>
      </div>
    </MetaAdsShell>
  );
}
