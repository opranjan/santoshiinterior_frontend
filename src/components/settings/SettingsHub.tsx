"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

type SettingsCard = {
  id: string;
  label: string;
  href: string;
  desc: string;
  icon: React.ReactNode;
  keywords?: string[];
};

type SettingsSection = {
  id: string;
  title: string;
  kicker: string;
  cards: SettingsCard[];
};

function CardShell({
  href,
  label,
  desc,
  icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="settings-tile group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 transition dark:border-[#3a342c] dark:bg-[#161411] sm:p-5"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1c1610] text-[#e8d5b5] shadow-[0_8px_18px_rgba(28,22,16,0.16)] dark:bg-[#e8d5b5] dark:text-[#1c1610]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="font-serif text-lg leading-tight text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {label}
        </p>
        <p className="mt-1 text-sm leading-snug text-[#8a7b68]">{desc}</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4a574] opacity-0 transition group-hover:opacity-100">
          Open →
        </p>
      </div>
    </Link>
  );
}

const iconClass = "h-5 w-5";

const IconCatalog = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
  </svg>
);

const IconQuoteSettings = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 14.3 7.8 16l.8-4.7L5.2 8l4.7-.7L12 3z" strokeLinejoin="round" />
  </svg>
);

const IconGeneral = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" strokeLinecap="round" />
  </svg>
);

const IconProjects = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" strokeLinecap="round" />
  </svg>
);

const IconTeam = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c.8-3.2 3.3-5 6-5s5.2 1.8 6 5" strokeLinecap="round" />
    <circle cx="17" cy="9" r="2.2" />
    <path d="M15.5 19c.4-1.8 1.6-3 3.2-3.5" strokeLinecap="round" />
  </svg>
);

const IconHero = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 15l5-5 4 4 3-3 6 6" strokeLinejoin="round" />
  </svg>
);

const IconTestimonials = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M7 17h10a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v10l3-1z" strokeLinejoin="round" />
    <path d="M8 10h8M8 13h5" strokeLinecap="round" />
  </svg>
);

const IconIntegrations = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10 8H7a3 3 0 000 6h3M14 8h3a3 3 0 010 6h-3" strokeLinecap="round" />
    <path d="M9 12h6" strokeLinecap="round" />
  </svg>
);

const SECTIONS: SettingsSection[] = [
  {
    id: "crm",
    title: "CRM",
    kicker: "Core",
    cards: [
      {
        id: "general",
        label: "General Settings",
        desc: "Company profile, locale, and CRM defaults",
        href: "/settings/general",
        icon: <IconGeneral />,
        keywords: ["company", "locale", "currency", "store"],
      },
      {
        id: "projects",
        label: "Project Settings",
        desc: "Types, scopes, budgets, and pipeline stages",
        href: "/settings/projects",
        icon: <IconProjects />,
        keywords: ["types", "scopes", "budgets", "sources"],
      },
      {
        id: "team",
        label: "Team Settings",
        desc: "Members, roles, and store access",
        href: "/settings/team",
        icon: <IconTeam />,
        keywords: ["users", "roles", "members", "invite"],
      },
      {
        id: "integrations",
        label: "Integrations",
        desc: "WhatsApp, telephony, and webhooks",
        href: "/settings/integrations",
        icon: <IconIntegrations />,
        keywords: ["whatsapp", "email", "api", "jio", "sip", "telephony", "call"],
      },
    ],
  },
  {
    id: "website",
    title: "Website",
    kicker: "Public",
    cards: [
      {
        id: "hero",
        label: "Home Banner",
        desc: "Hero slides, offers, and homepage promos",
        href: "/settings/website/hero",
        icon: <IconHero />,
        keywords: ["hero", "banner", "slider", "homepage", "offers", "promo", "subscribe", "newsletter"],
      },
      {
        id: "testimonials",
        label: "Testimonials",
        desc: "Client reviews shown on the website",
        href: "/settings/website/testimonials",
        icon: <IconTestimonials />,
        keywords: ["reviews", "website", "home", "clients"],
      },
    ],
  },
  {
    id: "quotations",
    title: "Quotations",
    kicker: "Sales",
    cards: [
      {
        id: "quotation-catalogs",
        label: "Quotation Catalogs",
        desc: "Items, categories, and units of measure",
        href: "/settings/quotations/catalogs",
        icon: <IconCatalog />,
        keywords: ["catalog", "items", "products"],
      },
      {
        id: "quotation-settings",
        label: "Quotation Settings",
        desc: "Templates, tax, and approval rules",
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
        const hay = [card.label, card.desc, ...(card.keywords || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      }),
    })).filter((section) => section.cards.length > 0);
  }, [query]);

  const total = SECTIONS.reduce((n, s) => n + s.cards.length, 0);

  return (
    <div className="vendor-form space-y-7">
      <div className="store-hero relative rounded-2xl px-5 py-5 text-[#e8d5b5] sm:px-7 sm:py-6">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c4a574]">
              Administration
            </p>
            <h1
              className="mt-2 font-serif text-[2rem] leading-none text-[#f3ece2] sm:text-[2.35rem]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Settings
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#c4b49a]">
              {total} configuration areas for CRM, website, and quotations.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c4a574]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings"
              className="h-11 w-full rounded-xl border border-[#e8d5b5]/25 bg-black/25 pl-10 pr-4 text-sm text-[#f3ece2] outline-none placeholder:text-[#a89880] focus:border-[#c4a574]"
            />
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
              {section.kicker}
            </p>
            <h2
              className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {section.title}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {section.cards.map((card) => (
              <CardShell
                key={card.id}
                href={card.href}
                label={card.label}
                desc={card.desc}
                icon={card.icon}
              />
            ))}
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#eadfcf] bg-[#fbf8f3] px-6 py-16 text-center dark:border-[#3a342c] dark:bg-[#161411]">
          <p
            className="font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            No settings match
          </p>
          <p className="mt-2 text-sm text-[#8a7b68]">Nothing found for “{query}”.</p>
        </div>
      )}
    </div>
  );
}
