"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { FulfillContext, FulfillDestination, FulfillLine } from "./vendorFulfill";

type Props = {
  label?: string;
  disabled?: boolean;
  compact?: boolean;
  ctx: FulfillContext;
  items: FulfillLine[];
  onDone?: (dest: FulfillDestination) => void;
};

export default function VendorFulfillButton({
  label = "Vendor",
  disabled,
  compact,
  ctx,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-10 min-w-[108px] items-center justify-center rounded-xl border border-[#c4a574] bg-[#fbf8f3] px-2.5 text-xs font-semibold text-[#1c1610] disabled:opacity-50"
            : "inline-flex h-9 items-center rounded-xl bg-[#C4A574] px-3 text-sm font-semibold text-[#1c1610] disabled:opacity-50"
        }
      >
        {label}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-md p-6 sm:p-8">
        <h3
          className="pr-10 font-serif text-xl text-[#1c1610]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {ctx.vendorName || "Vendor"}
        </h3>
        <p className="mt-1 text-sm text-[#8a7b68]">Choose order or purchase.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex h-24 flex-col items-center justify-center rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] text-[#1c1610] hover:border-[#c4a574]"
          >
            <span className="text-base font-semibold">Order</span>
          </button>
          <button
            type="button"
            className="flex h-24 flex-col items-center justify-center rounded-2xl bg-[#1c1610] text-[#e8d5b5] hover:bg-[#2a221a]"
          >
            <span className="text-base font-semibold">Purchase</span>
          </button>
        </div>
      </Modal>
    </>
  );
}
