"use client";

import Link from "next/link";
import React from "react";
import Button from "@/components/ui/button/Button";

type LeadsEmptyStateProps = {
  filtered: boolean;
  onClearFilters?: () => void;
};

export default function LeadsEmptyState({
  filtered,
  onClearFilters,
}: LeadsEmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(70, 95, 255, 0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(16, 185, 129, 0.08), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />

      <div className="relative flex flex-col items-center px-6 py-14 text-center sm:py-16">
        <div className="relative mb-6">
          <div className="absolute -inset-3 rounded-full bg-brand-500/10 blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/80 bg-gradient-to-br from-white to-gray-50 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-gray-700 dark:from-gray-900 dark:to-gray-950">
            <svg
              width="52"
              height="52"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden
            >
              <rect
                x="10"
                y="14"
                width="32"
                height="40"
                rx="6"
                fill="#465FFF"
                opacity="0.15"
              />
              <rect
                x="16"
                y="10"
                width="32"
                height="40"
                rx="6"
                fill="#465FFF"
              />
              <rect
                x="22"
                y="20"
                width="20"
                height="3.5"
                rx="1.75"
                fill="white"
                opacity="0.95"
              />
              <rect
                x="22"
                y="28"
                width="16"
                height="3"
                rx="1.5"
                fill="white"
                opacity="0.7"
              />
              <rect
                x="22"
                y="35"
                width="12"
                height="3"
                rx="1.5"
                fill="white"
                opacity="0.55"
              />
              <circle cx="46" cy="44" r="12" fill="#10B981" />
              <path
                d="M41.5 44.5l3 3 6.5-7"
                stroke="white"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">
          {filtered ? "No matches" : "Sales pipeline"}
        </p>
        <h3 className="max-w-md text-xl font-semibold tracking-tight text-gray-900 dark:text-white/90 sm:text-2xl">
          {filtered
            ? "No leads match your filters"
            : "Start building your lead pipeline"}
        </h3>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {filtered
            ? "Try a different search, status, or clear filters to see every enquiry across your stores."
            : "Capture walk-ins, referrals, and digital enquiries in one place — assign owners, log follow-ups, and move deals toward quotation."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {filtered && onClearFilters ? (
            <Button size="sm" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : null}
          <Link href="/sales/leads/new">
            <Button size="sm">+ New Lead</Button>
          </Link>
        </div>

        {!filtered && (
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
                className="rounded-xl border border-gray-100 bg-white/70 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
