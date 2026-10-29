"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import { fulfillItems, type FulfillContext, type FulfillDestination, type FulfillLine } from "./vendorFulfill";

type Props = {
  label?: string;
  disabled?: boolean;
  compact?: boolean;
  ctx: FulfillContext;
  items: FulfillLine[];
  onDone?: (dest: FulfillDestination, result: Awaited<ReturnType<typeof fulfillItems>>) => void;
};

export default function VendorFulfillButton({
  label = "Create order",
  disabled,
  compact,
  ctx,
  items,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const run = async (dest: FulfillDestination) => {
    if (!ctx.projectId) {
      toastWarning("Select a project first.");
      return;
    }
    if (!ctx.vendorId && !ctx.vendorName) {
      toastWarning("Select a vendor first.");
      return;
    }
    setSaving(true);
    try {
      const result = await fulfillItems(dest, ctx, items);
      toastSuccess(result.message);
      setOpen(false);
      onDone?.(dest, result);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-10 min-w-[108px] items-center justify-center rounded-xl border border-[#c4a574] bg-[#fbf8f3] px-2.5 text-xs font-semibold text-[#1c1610] disabled:opacity-50"
            : "inline-flex h-9 items-center rounded-xl bg-[#C4A574] px-3 text-sm font-semibold text-[#1c1610] disabled:opacity-50"
        }
      >
        {saving ? "Creating…" : label}
      </button>

      <Modal isOpen={open} onClose={() => !saving && setOpen(false)} className="max-w-md p-6 sm:p-8">
        <h3
          className="pr-10 font-serif text-xl text-[#1c1610]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Create order
        </h3>
        <p className="mt-1 text-sm text-[#8a7b68]">
          {items[0]?.name ? `${items[0].name} · ` : ""}
          {ctx.vendorName ? `${ctx.vendorName}. ` : ""}
          Creates this item only — stay on the collection.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void run("ORDER")}
            className="flex h-24 flex-col items-center justify-center rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] text-[#1c1610] hover:border-[#c4a574] disabled:opacity-50"
          >
            <span className="text-base font-semibold">Order</span>
            <span className="mt-1 text-[11px] text-[#8a7b68]">Work order for this item</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void run("PURCHASE")}
            className="flex h-24 flex-col items-center justify-center rounded-2xl bg-[#1c1610] text-[#e8d5b5] hover:bg-[#2a221a] disabled:opacity-50"
          >
            <span className="text-base font-semibold">Purchase</span>
            <span className="mt-1 text-[11px] text-[#c4a574]">PO + stock this item</span>
          </button>
        </div>
      </Modal>
    </>
  );
}
