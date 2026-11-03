"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  /** Compact icon-only control for tight header rows */
  compact?: boolean;
  className?: string;
};

export default function PanelTutorialButton({ compact = false, className = "" }: Props) {
  const pathname = usePathname();

  // Already on the tutorial page — no need for the header shortcut.
  if (pathname === "/tutorial" || pathname.startsWith("/tutorial/")) {
    return null;
  }

  return (
    <Link
      href="/tutorial"
      title="Tutorial"
      aria-label="Open panel tutorial"
      className={
        className ||
        (compact
          ? "inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#8a7b68] hover:bg-[#f7f0e6] hover:text-[#1c1610] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          : "inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#eadfcf] bg-white px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#5c4a32] hover:border-[#c4a574] hover:bg-[#fbf8f3] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-500")
      }
    >
      <svg
        viewBox="0 0 24 24"
        className={compact ? "h-5 w-5" : "h-4 w-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
      </svg>
      {compact ? null : <span>Tutorial</span>}
    </Link>
  );
}
