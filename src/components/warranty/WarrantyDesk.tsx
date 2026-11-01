"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import WarrantyDeskTable from "@/components/warranty/WarrantyDeskTable";
import CustomerWarrantyPanel from "@/components/warranty/CustomerWarrantyPanel";
import VendorWarrantyPanel from "@/components/warranty/VendorWarrantyPanel";
import { warrantyApi } from "@/services/crmApi";

type Tab = "customer" | "vendor" | "tickets";

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.7 4.2-1.3 7-4.5 7-8.7V6l-7-3Z" />
      <path d="m9.2 12 1.9 1.9 3.7-3.8" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m21 8-9 5L3 8" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="m12 3 9 5-9 5L3 8l9-5Z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9Z" />
      <path d="M9 7v10" />
    </svg>
  );
}

export default function WarrantyDesk() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("customer");
  const [openTicketCount, setOpenTicketCount] = useState(0);

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q === "vendor" || q === "tickets" || q === "customer") setTab(q);
  }, [searchParams]);

  useEffect(() => {
    warrantyApi
      .list({ limit: 200 })
      .then((data) => {
        const items = data.items || [];
        const open = items.filter((row) => {
          const status = String(row.status || "").toUpperCase();
          return status !== "RESOLVED" && status !== "CLOSED" && status !== "CANCELLED";
        }).length;
        setOpenTicketCount(open);
      })
      .catch(() => setOpenTicketCount(0));
  }, []);

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-[#2a2118] text-[#f3ece2] shadow-sm"
        : "border border-[#eadfcf] bg-white text-[#5c5348] hover:bg-[#fbf8f3]"
    }`;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-[#eadfcf] bg-[#f7f1e8]">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] md:block">
          <Image
            src="/images/casual/hero-living-room.jpg"
            alt=""
            fill
            priority
            className="object-cover opacity-90"
            sizes="46vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f1e8] via-[#f7f1e8]/75 to-transparent" />
        </div>

        <div className="relative z-10 max-w-xl px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <h1 className="text-[32px] font-semibold leading-none tracking-tight text-[#1c1610]">
            Warranty Desk
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#7a6f62]">
            Track customer &amp; vendor warranties, and manage claim tickets efficiently.
          </p>
        </div>

        <div className="relative z-10 mx-5 mb-5 rounded-2xl border border-[#e6d9c6] bg-[#f4ebe0]/95 p-4 shadow-sm backdrop-blur sm:mx-6 sm:mb-6 sm:p-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2a2118] text-[#e8d5b5]">
              <ShieldIcon />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1c1610]">Dual warranty tracking</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#7a6f62]">
                Keep <span className="font-semibold text-[#5c472c]">vendor warranties</span> for
                materials you bought on a project, then craft the{" "}
                <span className="font-semibold text-[#5c472c]">customer warranty</span> for that
                project by reviewing those vendor terms. Tickets remain for claims/service after
                handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab("customer")} className={tabClass(tab === "customer")}>
          <UsersIcon />
          Customer warranty
        </button>
        <button type="button" onClick={() => setTab("vendor")} className={tabClass(tab === "vendor")}>
          <BoxIcon />
          Vendor warranty
        </button>
        <button type="button" onClick={() => setTab("tickets")} className={tabClass(tab === "tickets")}>
          <TicketIcon />
          Claim tickets
          {openTicketCount > 0 ? (
            <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#d92d20] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {openTicketCount > 99 ? "99+" : openTicketCount}
            </span>
          ) : null}
        </button>
      </div>

      {tab === "customer" ? <CustomerWarrantyPanel /> : null}
      {tab === "vendor" ? <VendorWarrantyPanel /> : null}
      {tab === "tickets" ? <WarrantyDeskTable /> : null}
    </div>
  );
}
