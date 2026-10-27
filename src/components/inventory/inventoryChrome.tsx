"use client";

import React from "react";

export function SegPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-[#eadfcf] bg-white p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-lg px-4 py-1.5 text-sm ${
            value === opt.id ? "bg-[#C4A574] font-medium text-[#1c1610]" : "text-gray-500"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FilterBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadfcf] text-[#1c1610] hover:bg-[#faf6ef]"
      aria-label="Filter"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
    </button>
  );
}

export function EmptyTransactions({ hint = "Try changing the filters or date range." }: { hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden>
        <rect x="22" y="18" width="52" height="58" rx="6" fill="#eadfcf" />
        <rect x="30" y="30" width="36" height="6" rx="2" fill="#d4c4a8" />
        <rect x="30" y="42" width="28" height="5" rx="2" fill="#d4c4a8" />
        <rect x="30" y="52" width="32" height="5" rx="2" fill="#d4c4a8" />
        <circle cx="78" cy="58" r="18" fill="#faf6ef" stroke="#C4A574" strokeWidth="4" />
        <line x1="90" y1="70" x2="104" y2="84" stroke="#1c1610" strokeWidth="5" strokeLinecap="round" />
        <line x1="72" y1="52" x2="84" y2="64" stroke="#8a6a3a" strokeWidth="3" strokeLinecap="round" />
        <line x1="84" y1="52" x2="72" y2="64" stroke="#8a6a3a" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="mt-3 font-medium text-[#1c1610]">No transactions found</p>
      <p className="text-sm text-gray-400">{hint}</p>
    </div>
  );
}

export function EmptyAnalytics({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-sm text-gray-400">No data available</div>
  );
}

export function WarehouseActionMenu({
  archived,
  onEdit,
  onArchive,
  onReverted,
}: {
  archived?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onReverted: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const item = (label: string, action: () => void) => (
    <button
      type="button"
      className="block w-full px-3 py-2 text-left text-sm text-[#1c1610] hover:bg-[#faf6ef]"
      onClick={() => {
        setOpen(false);
        action();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#faf6ef] hover:text-[#1c1610]"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 min-w-[170px] rounded-xl border border-[#eadfcf] bg-white py-1 shadow-lg">
          {item("Edit", onEdit)}
          {item(archived ? "Unarchive" : "Archive", onArchive)}
          {item("View Reverted Tnx", onReverted)}
        </div>
      )}
    </div>
  );
}
