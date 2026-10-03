"use client";

import React from "react";

export default function VendorPageHeader({
  kicker = "Vendor Panel",
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="vendor-rise mb-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#9a7748]">{kicker}</p>
      <h1 className="vendor-serif mt-2 text-3xl md:text-4xl">{title}</h1>
      <div className="vendor-gold-rule mt-3" />
      {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b645b]">{subtitle}</p> : null}
    </div>
  );
}
