"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toastError } from "@/components/ui/toast/ToastHost";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  return `${day}-${mon}-${String(d.getFullYear()).slice(-2)}`;
}

function money(value?: number | null) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function ModularCatalogOrders() {
  const router = useRouter();
  const { user } = useAuth();
  const vendorView = isVendorPanelUser(user);
  const [items, setItems] = useState<PurchaseOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    const data = await purchaseOrdersApi.list({
      limit: 100,
      search,
      source: "MODULAR_CATALOG",
    });
    setItems(data.items || []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Procurement
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Modular Catalog Order
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Raise purchase orders from a series, catalogue, and size.
          </p>
        </div>
        {vendorView ? null : (
          <Link
            href="/operations/procurement/modular-catalog/new"
            className="inline-flex h-11 w-fit shrink-0 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610] lg:self-auto"
          >
            + Create order
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, vendor, title"
          className="h-11 w-full max-w-sm rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fdfbf7] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#eadfcf] bg-[#fbf8f3] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
              <tr>
                {["Code", "Title", "Project", "Vendor", "Amount", "Date", "State"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    No modular catalog orders yet. Create one from a catalogue size.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[#eadfcf]/70 last:border-0 hover:bg-[#f6efe4] dark:border-[#3a342c]"
                    onClick={() => router.push(`/operations/procurement/orders/${row.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {row.code}
                    </td>
                    <td className="px-4 py-3.5 text-[#5c472c]">{row.title || "—"}</td>
                    <td className="px-4 py-3.5 text-[#8a7b68]">{row.project?.name || "—"}</td>
                    <td className="px-4 py-3.5 text-[#5c472c]">{row.vendorRecord?.name || row.vendor}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#1c1610]">{money(row.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#8a7b68]">
                      {formatDate(row.orderDate || row.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#8a7b68]">
                      {row.orderState?.replaceAll("_", " ") || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
