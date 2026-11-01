"use client";

import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import WarrantyDeskTable from "@/components/warranty/WarrantyDeskTable";
import CustomerWarrantyPanel from "@/components/warranty/CustomerWarrantyPanel";
import VendorWarrantyPanel from "@/components/warranty/VendorWarrantyPanel";

type Tab = "customer" | "vendor" | "tickets";

const tabBtn = (active: boolean) =>
  `px-4 py-2.5 text-sm font-semibold transition ${
    active
      ? "bg-[#1c1610] text-[#e8d5b5]"
      : "bg-white text-[#6b645b] hover:bg-[#fbf8f3] dark:bg-[#161411] dark:text-[#b8aea0]"
  }`;

export default function WarrantyDesk() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("customer");

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q === "vendor" || q === "tickets" || q === "customer") setTab(q);
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
        <h2 className="text-lg font-semibold text-[#1c1610] dark:text-[#f3ece2]">
          Dual warranty tracking
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[#8a7b68]">
          Keep <span className="font-semibold text-[#5c472c]">vendor warranties</span> for
          materials you bought on a project, then craft the{" "}
          <span className="font-semibold text-[#5c472c]">customer warranty</span> for that
          project by reviewing those vendor terms. Tickets remain for claims/service after
          handover.
        </p>
      </div>

      <div className="inline-flex overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
        <button type="button" onClick={() => setTab("customer")} className={tabBtn(tab === "customer")}>
          Customer warranty
        </button>
        <button type="button" onClick={() => setTab("vendor")} className={tabBtn(tab === "vendor")}>
          Vendor warranty
        </button>
        <button type="button" onClick={() => setTab("tickets")} className={tabBtn(tab === "tickets")}>
          Claim tickets
        </button>
      </div>

      {tab === "customer" ? <CustomerWarrantyPanel /> : null}
      {tab === "vendor" ? <VendorWarrantyPanel /> : null}
      {tab === "tickets" ? <WarrantyDeskTable /> : null}
    </div>
  );
}
