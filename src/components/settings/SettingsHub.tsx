"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

type SettingsCard = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  keywords?: string[];
};

type SettingsSection = {
  id: string;
  title: string;
  cards: SettingsCard[];
};

function CardShell({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex w-[112px] flex-col items-center gap-2.5 sm:w-[120px]"
    >
      <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] dark:border-gray-800 dark:bg-white/[0.04] sm:h-[96px] sm:w-[96px]">
        <div className="flex h-14 w-14 items-center justify-center">{icon}</div>
      </div>
      <span className="max-w-[120px] text-center text-xs font-medium leading-snug text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </Link>
  );
}

const IconCatalog = () => (
  <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
    <rect x="12" y="8" width="36" height="48" rx="6" fill="#F9A8D4" />
    <rect x="18" y="16" width="24" height="4" rx="2" fill="white" opacity="0.9" />
    <rect x="18" y="24" width="20" height="3" rx="1.5" fill="white" opacity="0.75" />
    <rect x="18" y="31" width="18" height="3" rx="1.5" fill="white" opacity="0.75" />
    <circle cx="46" cy="46" r="12" fill="#EC4899" />
    <path
      d="M40 46.5l3.5 3.5L52 41"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconQuoteSettings = () => (
  <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
    <circle cx="32" cy="32" r="24" fill="#F9A8D4" />
    <text
      x="32"
      y="38"
      textAnchor="middle"
      fontSize="22"
      fontWeight="700"
      fill="white"
      fontFamily="system-ui,sans-serif"
    >
      Q
    </text>
    <circle cx="46" cy="46" r="11" fill="#DB2777" />
    <path
      d="M46 40.5v3M46 48.5v3M40.5 46h3M48.5 46h3M42 42l2 2M48 48l2 2M42 50l2-2M48 44l2-2"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const IconGeneral = () => (
  <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
    <circle cx="32" cy="32" r="22" fill="#C4B5FD" />
    <circle cx="32" cy="32" r="8" fill="white" />
    <path
      d="M32 14v6M32 44v6M14 32h6M44 32h6M19 19l4 4M41 41l4 4M19 45l4-4M41 23l4-4"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const IconProjects = () => (
  <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
    <rect x="10" y="18" width="44" height="30" rx="6" fill="#93C5FD" />
    <path d="M10 28h44" stroke="#1D4ED8" strokeWidth="3" />
    <rect x="18" y="34" width="12" height="8" rx="2" fill="white" opacity="0.9" />
    <rect x="34" y="34" width="12" height="8" rx="2" fill="#3B82F6" />
  </svg>
);

const IconTeam = () => (
  <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
    <circle cx="32" cy="22" r="10" fill="#F9A8D4" />
    <path d="M14 50c2-10 10-16 18-16s16 6 18 16" fill="#EC4899" />
    <circle cx="48" cy="24" r="7" fill="#FBCFE8" />
    <circle cx="16" cy="24" r="7" fill="#FBCFE8" />
  </svg>
);

const IconIntegrations = () => (
  <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none">
    <rect x="12" y="20" width="18" height="24" rx="5" fill="#FDBA74" />
    <rect x="34" y="20" width="18" height="24" rx="5" fill="#FB923C" />
    <path
      d="M30 32h4M26 28v8M38 28v8"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const SECTIONS: SettingsSection[] = [
  {
    id: "crm",
    title: "CRM",
    cards: [
      {
        id: "general",
        label: "General Settings",
        href: "/settings/general",
        icon: <IconGeneral />,
        keywords: ["company", "locale", "currency", "store"],
      },
      {
        id: "projects",
        label: "Project Settings",
        href: "/settings/projects",
        icon: <IconProjects />,
        keywords: ["types", "scopes", "budgets", "sources"],
      },
      {
        id: "team",
        label: "Team Settings",
        href: "/settings/team",
        icon: <IconTeam />,
        keywords: ["users", "roles", "members", "invite"],
      },
      {
        id: "integrations",
        label: "Integrations",
        href: "/settings/integrations",
        icon: <IconIntegrations />,
        keywords: ["whatsapp", "email", "api"],
      },
    ],
  },
  {
    id: "quotations",
    title: "Quotations",
    cards: [
      {
        id: "quotation-catalogs",
        label: "Quotation Catalogs",
        href: "/settings/quotations/catalogs",
        icon: <IconCatalog />,
        keywords: ["catalog", "items", "products"],
      },
      {
        id: "quotation-settings",
        label: "Quotation Settings",
        href: "/settings/quotations/settings",
        icon: <IconQuoteSettings />,
        keywords: ["quote", "defaults"],
      },
    ],
  },
];

export default function SettingsHub() {
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      cards: section.cards.filter((card) => {
        const hay = [card.label, ...(card.keywords || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      }),
    })).filter((section) => section.cards.length > 0);
  }, [query]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white/90 sm:text-3xl">
          Settings
        </h1>
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {section.title}
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-8 sm:gap-x-8">
            {section.cards.map((card) => (
              <CardShell
                key={card.id}
                href={card.href}
                label={card.label}
                icon={card.icon}
              />
            ))}
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="py-16 text-center text-sm text-gray-500">
          No settings match “{query}”.
        </p>
      )}
    </div>
  );
}
