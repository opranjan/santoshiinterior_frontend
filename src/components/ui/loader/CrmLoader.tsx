import React from "react";

export function Shimmer({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`crm-shimmer ${className}`} aria-hidden />;
}

export function CrmSpinner({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin text-[#c4a574] ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TableSkeleton({
  rows = 7,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
      <div className="grid gap-3 border-b border-[#f0e8db] bg-[#fbf8f3] px-4 py-3.5 dark:border-[#3a342c] dark:bg-[#1c1914] sm:grid-cols-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="hidden h-3 rounded-full sm:block" />
        ))}
        <Shimmer className="h-3 w-1/3 rounded-full sm:hidden" />
      </div>
      <div className="divide-y divide-[#f0e8db] dark:divide-[#3a342c]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 px-4 py-3.5 sm:grid sm:grid-cols-6 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:col-span-2">
              <Shimmer className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-3 w-3/4 rounded-full" />
                <Shimmer className="h-2.5 w-1/2 rounded-full" />
              </div>
            </div>
            {Array.from({ length: Math.max(cols - 2, 1) }).map((_, c) => (
              <Shimmer key={c} className="hidden h-3 rounded-full sm:block" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="space-y-2">
        <Shimmer className="h-2.5 w-28 rounded-full" />
        <Shimmer className="h-8 w-56 rounded-lg sm:h-9 sm:w-72" />
        <Shimmer className="h-3 w-64 max-w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]"
          >
            <Shimmer className="h-2.5 w-16 rounded-full" />
            <Shimmer className="mt-3 h-7 w-12 rounded-md" />
          </div>
        ))}
      </div>
      <Shimmer className="h-12 w-full rounded-2xl" />
      <TableSkeleton />
    </div>
  );
}

export function CrmBootScreen({ label = "Loading CRM" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f3ec] dark:bg-[#12100e]">
      <div className="flex items-center gap-3 border-b border-[#eadfcf] bg-white/80 px-4 py-3 dark:border-[#3a342c] dark:bg-[#161411]/90 sm:px-6">
        <Shimmer className="h-9 w-9 rounded-xl" />
        <Shimmer className="h-4 w-40 rounded-full" />
        <Shimmer className="ml-auto hidden h-9 w-64 rounded-full sm:block" />
        <Shimmer className="h-9 w-9 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[90px] shrink-0 border-r border-[#eadfcf] bg-white p-3 dark:border-[#3a342c] dark:bg-[#161411] lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} className="mx-auto mb-3 h-9 w-9 rounded-xl" />
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <CrmSpinner className="h-5 w-5" />
            <p className="text-sm font-medium text-[#8a7b68]">{label}</p>
          </div>
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#eadfcf] dark:divide-[#3a342c]" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-3 w-2/3 rounded-full" />
            <Shimmer className="h-2.5 w-1/2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#8a7b68]" role="status">
      <CrmSpinner className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
