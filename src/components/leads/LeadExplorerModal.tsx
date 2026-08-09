"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LEAD_MODULES,
  leadModuleHref,
  type LeadModuleDef,
  type LeadModuleId,
} from "@/lib/leadModules";

type LeadLite = {
  id: string;
  clientName: string;
  projectName?: string;
};

function ModuleIcon({ id }: { id: LeadModuleDef["icon"] }) {
  const cls = "h-7 w-7";
  switch (id) {
    case "summary":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M4 19V5M4 19h16M8 15v-3M12 15V9M16 15V7" stroke="#E85D75" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "details":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.5" stroke="#3B82F6" strokeWidth="1.8" />
          <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "notes":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M8 4h8a2 2 0 012 2v14l-4-2-4 2V6a2 2 0 012-2z" stroke="#E85D75" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "quotations":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M7 4h10v16H7z" stroke="#F97316" strokeWidth="1.8" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "inspirations":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z" stroke="#A855F7" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "documents":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M4 7a2 2 0 012-2h5l3 3h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke="#F97316" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "project-plan":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="12" rx="2" stroke="#7C3AED" strokeWidth="1.8" />
          <path d="M8 10h8M8 13h5" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "finance-plan":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M4 10h16v10H4zM8 10V7h8v3" stroke="#16A34A" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "site":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M4 18l4-6 4 3 4-8 4 11" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "communication":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <path d="M5 6h14v9H8l-3 3V6z" stroke="#2563EB" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "vtour":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#2563EB" strokeWidth="1.8" />
          <path d="M9 12h6M12 9v6" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function ModuleCard({
  module,
  leadId,
  onNavigate,
}: {
  module: LeadModuleDef;
  leadId: string;
  onNavigate: () => void;
}) {
  const href = leadModuleHref(leadId, module.id);
  const body = (
    <div className="relative flex h-full min-h-[108px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-[#fafafa] px-3 py-4 text-center transition hover:border-[#E85D75]/30 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03]">
      {module.badge ? (
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            module.badgeTone === "pink"
              ? "bg-[#E85D75]/10 text-[#E85D75]"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {module.badge}
        </span>
      ) : null}
      <ModuleIcon id={module.icon} />
      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
        {module.label}
      </p>
    </div>
  );

  if (!module.ready) {
    return (
      <div className="opacity-70" title="Coming soon">
        {body}
      </div>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} className="block h-full">
      {body}
    </Link>
  );
}

export default function LeadExplorerModal({
  lead,
  open,
  onClose,
}: {
  lead: LeadLite | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E85D75]/10 text-[#E85D75]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Explore Lead Modules
              </h2>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  <strong className="text-gray-700 dark:text-gray-300">CLIENT:</strong>{" "}
                  {lead.clientName}
                </span>
                <span>
                  <strong className="text-gray-700 dark:text-gray-300">LEAD:</strong>{" "}
                  {lead.projectName || `Lead ${lead.id.slice(0, 8)}`}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {LEAD_MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              leadId={lead.id}
              onNavigate={() => {
                onClose();
                router.push(leadModuleHref(lead.id, module.id));
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
