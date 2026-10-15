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
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumb ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">
            {crumb}
          </p>
        ) : null}
        <h1
          className="mt-1 font-serif text-[1.45rem] leading-tight text-[#1c1610] sm:text-[1.75rem] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7b68]">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:w-auto sm:items-center [&>a]:max-sm:flex-1 [&>button]:max-sm:flex-1 [&>label]:max-sm:min-w-0 [&>label]:max-sm:flex-1 [&>select]:max-sm:min-w-0 [&>select]:max-sm:flex-1">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
