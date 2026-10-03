"use client";

import Link from "next/link";
import React from "react";

type LeadsEmptyStateProps = {
  filtered: boolean;
  onClearFilters?: () => void;
};

export default function LeadsEmptyState({
  filtered,
  onClearFilters,
}: LeadsEmptyStateProps) {
  return (
    <div className="vendor-form-card overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
      <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1c1610] text-[#e8d5b5]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M4 12h10M4 17h7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7748]">
          {filtered ? "No matches" : "Sales pipeline"}
        </p>
        <h3 className="font-serif text-2xl text-[#1c1610] dark:text-[#f4efe6]">
          {filtered ? "No leads match your filters" : "Start building your lead pipeline"}
        </h3>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#8a7b68]">
          {filtered
            ? "Try a different search, status, or clear filters to see every enquiry across your stores."
            : "Capture walk-ins, referrals, and digital enquiries — assign owners, log follow-ups, and move deals toward quotation."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {filtered && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-11 rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#1c1610] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:text-[#f4efe6]"
            >
              Clear filters
            </button>
          ) : null}
          <Link
            href="/sales/leads/new"
            className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] hover:bg-black"
          >
            + New lead
          </Link>
        </div>
        {!filtered ? (
          <ul className="mt-10 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            {[
              {
                title: "Capture fast",
                text: "Client, project type, store & budget in one form",
              },
              {
                title: "Never miss follow-up",
                text: "Log calls, WhatsApp & next action dates",
              },
              {
                title: "Convert to quote",
                text: "Move won interest straight into quotations",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-3 dark:border-[#3a342c] dark:bg-[#1c1914]"
              >
                <p className="text-sm font-semibold text-[#1c1610] dark:text-[#f4efe6]">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8a7b68]">{item.text}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
