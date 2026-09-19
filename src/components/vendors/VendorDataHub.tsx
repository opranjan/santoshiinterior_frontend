"use client";

import Link from "next/link";
import React from "react";
import { useVendorRecord, VendorDataHeader } from "./VendorDataHeader";

function Tile({
  href,
  label,
  icon,
}: {
  href: string;
  label: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex w-[120px] flex-col items-center gap-3">
      <div className="flex h-[108px] w-[108px] items-center justify-center rounded-[28px] bg-gradient-to-b from-gray-50 to-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(15,23,42,0.08)] transition group-hover:-translate-y-0.5 dark:from-white/[0.06] dark:to-white/[0.02]">
        {icon}
      </div>
      <span className="max-w-[120px] text-center text-sm font-medium leading-snug text-gray-600 dark:text-gray-300">
        {label}
      </span>
    </Link>
  );
}

const IconBasic = () => (
  <svg viewBox="0 0 72 72" className="h-16 w-16 drop-shadow-lg">
    <defs>
      <linearGradient id="vb" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#7DD3FC" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <rect x="16" y="12" width="40" height="48" rx="12" fill="url(#vb)" />
    <circle cx="36" cy="30" r="9" fill="white" opacity="0.95" />
    <path d="M22 54c2.5-10 25.5-10 28 0" fill="white" opacity="0.95" />
    <circle cx="48" cy="50" r="11" fill="#1D4ED8" />
    <rect x="43" y="46" width="10" height="9" rx="2" fill="#93C5FD" />
    <path d="M45 46v-2a3 3 0 016 0v2" stroke="white" strokeWidth="2" fill="none" />
  </svg>
);

const IconProjects = () => (
  <svg viewBox="0 0 72 72" className="h-16 w-16 drop-shadow-lg">
    <defs>
      <linearGradient id="vp" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#F0ABFC" />
        <stop offset="100%" stopColor="#C026D3" />
      </linearGradient>
    </defs>
    <rect x="14" y="18" width="44" height="34" rx="8" fill="url(#vp)" />
    <path d="M14 28h44" stroke="white" strokeWidth="3" opacity="0.35" />
    <circle cx="50" cy="50" r="13" fill="#A21CAF" />
    <circle cx="50" cy="46" r="5" fill="white" />
    <path d="M42 58c1.5-6 13.5-6 16 0" fill="white" />
  </svg>
);

const IconDocs = () => (
  <svg viewBox="0 0 72 72" className="h-16 w-16 drop-shadow-lg">
    <defs>
      <linearGradient id="vd" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <path d="M18 24h16l6 8h18a8 8 0 018 8v18a8 8 0 01-8 8H18a8 8 0 01-8-8V32a8 8 0 018-8z" fill="url(#vd)" />
    <rect x="28" y="38" width="20" height="16" rx="3" fill="white" opacity="0.9" />
    <path d="M32 50V42h4l8 8h-8v-4" fill="#0284C7" />
  </svg>
);

const IconInvoices = () => (
  <svg viewBox="0 0 72 72" className="h-16 w-16 drop-shadow-lg">
    <defs>
      <linearGradient id="vi" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#BFDBFE" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <rect x="18" y="10" width="32" height="44" rx="6" fill="url(#vi)" />
    <rect x="24" y="18" width="20" height="3" rx="1.5" fill="white" opacity="0.85" />
    <rect x="24" y="25" width="16" height="3" rx="1.5" fill="white" opacity="0.7" />
    <rect x="24" y="32" width="18" height="3" rx="1.5" fill="white" opacity="0.7" />
    <circle cx="48" cy="50" r="13" fill="#16A34A" />
    <text x="48" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill="white">
      ₹
    </text>
  </svg>
);

export default function VendorDataHub({ vendorId }: { vendorId: string }) {
  const { vendor, error, loading } = useVendorRecord(vendorId);
  const base = `/operations/vendors/${vendorId}`;

  if (loading) return <p className="text-sm text-gray-500">Loading vendor...</p>;
  if (error) {
    return (
      <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-600">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <VendorDataHeader vendor={vendor} />
      <div className="flex flex-wrap gap-8 px-1 pt-2">
        <Tile href={`${base}/basic`} label="Basic Details" icon={<IconBasic />} />
        <Tile href={`${base}/projects`} label="Vendor Projects" icon={<IconProjects />} />
        <Tile
          href={`${base}/documents`}
          label={
            <>
              Vendor
              <br />
              Documents
            </>
          }
          icon={<IconDocs />}
        />
        <Tile href={`${base}/invoices`} label="Invoices" icon={<IconInvoices />} />
      </div>
    </div>
  );
}
