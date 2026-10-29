"use client";

import React, { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { VendorDto } from "@/services/crmApi";

type Props = {
  vendors: VendorDto[];
  value?: string | null;
  label?: string;
  disabled?: boolean;
  onSelect: (vendor: VendorDto | null) => void;
};

export default function VendorPickButton({ vendors, value, label = "Vendor", disabled, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = vendors.find((row) => row.id === value) || null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((row) => row.name.toLowerCase().includes(q));
  }, [vendors, search]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-2.5 text-xs font-semibold text-[#1c1610] disabled:opacity-50"
      >
        {selected?.name || label}
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-md p-6 sm:p-8">
        <h3
          className="pr-10 font-serif text-xl text-[#1c1610]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Vendor
        </h3>
        <p className="mt-1 text-sm text-[#8a7b68]">Pick a vendor for this item.</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor"
          className="mt-4 h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm outline-none focus:border-[#c4a574]"
        />
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-[#eadfcf]">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#8a7b68]">No vendors found.</p>
          ) : (
            filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  onSelect(row);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-[#fbf8f3] ${
                  row.id === value ? "bg-[#fbf8f3] font-semibold" : "text-[#1c1610]"
                }`}
              >
                {row.name}
              </button>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
