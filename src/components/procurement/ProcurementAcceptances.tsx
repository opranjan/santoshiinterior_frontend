"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import ReceiveAdhocModal from "@/components/procurement/ReceiveAdhocModal";
import AcceptancePreviewDrawer from "@/components/procurement/AcceptancePreviewDrawer";
import { toastError } from "@/components/ui/toast/ToastHost";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${day}-${mon}-${d.getFullYear()}`;
}

function isOverdue(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return start.getTime() < now.getTime();
}

export default function ProcurementAcceptances() {
  const router = useRouter();
  const [kind, setKind] = useState<"PO" | "WO">("PO");
  const [status, setStatus] = useState<"PENDING" | "PARTIAL" | "ACCEPTED">("PENDING");
  const [items, setItems] = useState<PurchaseOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [preview, setPreview] = useState<PurchaseOrderDto | null>(null);

  const load = async () => {
    const data = await purchaseOrdersApi.list({
      limit: 100,
      kind,
      acceptanceStatus: status,
    });
    setItems(data.items || []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load acceptances"))
      .finally(() => setLoading(false));
  }, [kind, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) =>
      [row.code, row.title, row.vendor, row.vendorRecord?.name, row.project?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [items, search]);

  const overdueCount = filtered.filter((row) => isOverdue(row.expectedDate)).length;
  const kindLabel = kind === "WO" ? "work orders" : "purchase orders";

  const tabBtn = (active: boolean) =>
    `h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
      active
        ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
    }`;

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
            Acceptance
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Receive deliveries against purchase and work orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdhocOpen(true)}
          className="inline-flex h-11 w-fit shrink-0 items-center self-start rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] hover:bg-black dark:bg-[#e8d5b5] dark:text-[#1c1610] lg:self-auto"
        >
          + Receive ad-hoc
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-y divide-[#eadfcf] sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-[#3a342c]">
          <StatTile label="On this list" value={loading ? "—" : String(filtered.length)} />
          <StatTile label={kind === "WO" ? "Work orders" : "Purchase orders"} value={loading ? "—" : String(filtered.length)} />
          <StatTile label="Overdue" value={loading ? "—" : String(overdueCount)} accent />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="inline-flex self-start overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
          <button type="button" onClick={() => setKind("PO")} className={tabBtn(kind === "PO")}>
            Purchase orders
          </button>
          <button type="button" onClick={() => setKind("WO")} className={tabBtn(kind === "WO")}>
            Work orders
          </button>
        </div>
        <div className="inline-flex self-start overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
          <button type="button" onClick={() => setStatus("PENDING")} className={tabBtn(status === "PENDING")}>
            Pending
          </button>
          <button type="button" onClick={() => setStatus("PARTIAL")} className={tabBtn(status === "PARTIAL")}>
            Partial
          </button>
          <button type="button" onClick={() => setStatus("ACCEPTED")} className={tabBtn(status === "ACCEPTED")}>
            Accepted
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3a594]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, name, project, or vendor"
            className="h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] pl-10 pr-3.5 text-sm text-[#1c1610] outline-none placeholder:text-[#b3a594] focus:border-[#c4a574] focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e8db] bg-[#fbf8f3] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] dark:border-[#3a342c] dark:bg-[#1c1914]">
                <th className="px-4 py-3.5">S. no.</th>
                <th className="px-4 py-3.5">{kind === "WO" ? "WO number" : "PO number"}</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Project</th>
                <th className="px-4 py-3.5">Vendor</th>
                <th className="px-4 py-3.5">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                    Loading acceptances…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p
                      className="font-serif text-xl text-[#1c1610] dark:text-[#f4efe6]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      No {status.toLowerCase()} {kindLabel}
                    </p>
                    <p className="mt-1 text-sm text-[#8a7b68]">
                      {search
                        ? "Try a different search, or switch Pending / Partial / Accepted."
                        : "Orders waiting to be received will show up here."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[#f0e8db] last:border-0 hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                    onClick={() => router.push(`/operations/procurement/acceptances/${row.id}`)}
                  >
                    <td className="px-4 py-3.5 text-[#8a7b68]">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#9a7748]">
                        {row.code}
                        <button
                          type="button"
                          className="rounded-md px-1 text-[#8a7b68] hover:bg-[#eadfcf] hover:text-[#1c1610]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreview(row);
                          }}
                          aria-label="Preview order"
                        >
                          ↗
                        </button>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#1c1610] dark:text-[#f3ece2]">{row.title || "—"}</td>
                    <td className="px-4 py-3.5 text-[#6b645b]">{row.project?.name || "Unknown project"}</td>
                    <td className="px-4 py-3.5 text-[#1c1610] dark:text-[#f3ece2]">{row.vendorRecord?.name || row.vendor}</td>
                    <td className={`px-4 py-3.5 ${isOverdue(row.expectedDate) ? "font-semibold text-rose-600" : "text-[#6b645b]"}`}>
                      {formatDate(row.expectedDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiveAdhocModal
        open={adhocOpen}
        onClose={() => setAdhocOpen(false)}
        onCreated={(id) => {
          setAdhocOpen(false);
          router.push(`/operations/procurement/acceptances/${id}`);
        }}
      />
      <AcceptancePreviewDrawer
        open={Boolean(preview)}
        row={preview}
        onClose={() => setPreview(null)}
        onUpdated={(updated) => {
          setPreview(updated);
          setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">{label}</p>
      <p
        className={`mt-1 font-serif text-2xl ${accent ? "text-[#9a7748]" : "text-[#1c1610] dark:text-[#f3ece2]"}`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {value}
      </p>
    </div>
  );
}
