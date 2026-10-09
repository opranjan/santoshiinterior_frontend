"use client";

import React from "react";

export default function HrPageHeader({
  crumb,
  title,
  subtitle,
  actions,
}: {
  crumb?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {crumb ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
            {crumb}
          </p>
        ) : null}
        <h1
          className="mt-1 font-serif text-[1.75rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7b68]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
