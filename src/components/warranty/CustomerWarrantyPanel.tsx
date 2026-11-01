"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  warrantyCoverageApi,
  type CustomerWarrantyDto,
} from "@/services/crmApi";
import CustomerWarrantyReceiptPreview from "@/components/warranty/CustomerWarrantyReceiptPreview";
import { openWarrantyReceiptPrintWindow } from "@/lib/warrantyReceiptPrint";

const fieldClass =
  "h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574]";

const THUMBS = [
  "/images/product/product-01.jpg",
  "/images/product/product-02.jpg",
  "/images/product/product-03.jpg",
  "/images/product/product-04.jpg",
  "/images/product/product-05.jpg",
  "/images/cards/card-01.jpg",
  "/images/cards/card-02.jpg",
  "/images/casual/hero-living-room.jpg",
];

type StatusKey = "active" | "expiring" | "expired";
type PeriodFilter = "all" | StatusKey;

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function warrantyStatus(row: CustomerWarrantyDto): StatusKey {
  if (!row.endsOn) return "active";
  const end = new Date(row.endsOn);
  if (Number.isNaN(end.getTime())) return "active";
  const endMs = startOfDay(end);
  const today = startOfDay();
  const in30 = today + 30 * 24 * 60 * 60 * 1000;
  if (endMs < today) return "expired";
  if (endMs <= in30) return "expiring";
  return "active";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function materialsTitle(row: CustomerWarrantyDto) {
  const items = row.coverageItems || [];
  if (!items.length) return row.coverageSummary || "No materials";
  const names = items.map((item) => item.title).filter(Boolean);
  if (!names.length) return "Materials";
  return names[0];
}

function materialsCountLabel(row: CustomerWarrantyDto) {
  const n = (row.coverageItems || []).length;
  if (!n) return "0 materials";
  return `${n} material${n === 1 ? "" : "s"}`;
}

function thumbFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % THUMBS.length;
  return THUMBS[hash];
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#8a7b68]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7b68]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#9a7748]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function ClockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function ShieldOkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.7 4.2-1.3 7-4.5 7-8.7V6l-7-3Z" />
      <path d="m9.2 12 1.9 1.9 3.7-3.8" />
    </svg>
  );
}

function ShieldOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.7 4.2-1.3 7-4.5 7-8.7V6l-7-3Z" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function StatusPill({ status }: { status: StatusKey }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6ee] px-2.5 py-1 text-[11px] font-semibold text-[#1f7a45]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1f7a45]" />
        Active
      </span>
    );
  }
  if (status === "expiring") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-2.5 py-1 text-[11px] font-semibold text-[#b76a1a]">
        <ClockIcon className="h-3 w-3" />
        Expiring
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdeceb] px-2.5 py-1 text-[11px] font-semibold text-[#b42318]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#b42318]" />
      Expired
    </span>
  );
}

export default function CustomerWarrantyPanel() {
  const [rows, setRows] = useState<CustomerWarrantyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [preview, setPreview] = useState<CustomerWarrantyDto | null>(null);

  const load = async () => {
    const data = await warrantyCoverageApi.listCustomer({ search: search || undefined });
    setRows(data || []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [search]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.projectId) map.set(row.projectId, row.project?.name || row.projectId);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const client = row.project?.clientName?.trim();
      if (client) set.add(client);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (projectFilter !== "all" && row.projectId !== projectFilter) return false;
      if (clientFilter !== "all" && (row.project?.clientName || "") !== clientFilter) return false;
      if (periodFilter !== "all" && warrantyStatus(row) !== periodFilter) return false;
      return true;
    });
  }, [rows, projectFilter, clientFilter, periodFilter]);

  const stats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();
    let thisMonthCount = 0;
    let prevMonthCount = 0;

    for (const row of rows) {
      const status = warrantyStatus(row);
      if (status === "active") active += 1;
      else if (status === "expiring") expiring += 1;
      else expired += 1;

      if (row.createdAt) {
        const created = new Date(row.createdAt);
        if (!Number.isNaN(created.getTime())) {
          if (created.getMonth() === thisMonth && created.getFullYear() === thisYear) {
            thisMonthCount += 1;
          }
          if (created.getMonth() === prevMonth && created.getFullYear() === prevYear) {
            prevMonthCount += 1;
          }
        }
      }
    }

    let growthLabel: string | null = null;
    if (prevMonthCount > 0) {
      const pct = Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100);
      growthLabel = `${pct >= 0 ? "+" : ""}${pct}%`;
    } else if (thisMonthCount > 0) {
      growthLabel = "+100%";
    }

    return { total: rows.length, active, expiring, expired, growthLabel };
  }, [rows]);

  const openPreview = async (row: CustomerWarrantyDto) => {
    try {
      const full = await warrantyCoverageApi.getCustomer(row.id);
      setPreview(full);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to open preview");
    }
  };

  const downloadPdf = async (row: CustomerWarrantyDto) => {
    try {
      const full = await warrantyCoverageApi.getCustomer(row.id);
      const ok = openWarrantyReceiptPrintWindow(full);
      if (!ok) toastWarning("Allow pop-ups to download the PDF.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to open PDF");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this customer warranty?")) return;
    try {
      await warrantyCoverageApi.removeCustomer(id);
      toastSuccess("Deleted.");
      if (preview?.id === id) setPreview(null);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 xl:max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer warranty, project, client..."
              className={`${fieldClass} w-full pl-10`}
            />
          </div>

          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              <option value="all">All Projects</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>

          <div className="relative">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              <option value="all">All Clients</option>
              {clientOptions.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>

          <div className="relative">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              <option value="all">All Period</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring</option>
              <option value="expired">Expired</option>
            </select>
            <ChevronIcon />
          </div>
        </div>

        <Link
          href="/warranty-desk/customer/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#2a2118] px-4 text-sm font-semibold text-[#f3ece2]"
        >
          <span className="text-base leading-none">+</span>
          Customer warranty
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
            Total Warranties
          </p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.total}</p>
            {stats.growthLabel ? (
              <span className="mb-1 text-xs font-semibold text-[#1f7a45]">↑ {stats.growthLabel}</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">Active</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf6ee] text-[#1f7a45]">
              <ShieldOkIcon />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.active}</p>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
              Expiring (30 Days)
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4e5] text-[#b76a1a]">
              <ClockIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.expiring}</p>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">Expired</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fdeceb] text-[#b42318]">
              <ShieldOffIcon />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610]">{stats.expired}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-[0_1px_2px_rgba(28,22,16,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f4ebe0] text-[11px] uppercase tracking-[0.12em] text-[#7a6f62]">
              <tr>
                <th className="px-4 py-3.5 text-left font-semibold">Project / Client</th>
                <th className="px-4 py-3.5 text-left font-semibold">Materials</th>
                <th className="px-4 py-3.5 text-left font-semibold">Warranty Period</th>
                <th className="px-4 py-3.5 text-left font-semibold">Status</th>
                <th className="px-4 py-3.5 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#8a7b68]">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#8a7b68]">
                    No customer warranties match these filters.{" "}
                    <Link href="/warranty-desk/customer/new" className="font-semibold text-[#9a7748]">
                      Add materials
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const status = warrantyStatus(row);
                  const projectName = row.project?.name || "Project";
                  const client = row.project?.clientName;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[#f0e8db] hover:bg-[#fbf8f3]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-[#eadfcf]">
                            <Image
                              src={thumbFor(row.id)}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1c1610]">
                              {projectName}
                              {client ? ` · ${client}` : ""}
                            </p>
                            <p className="truncate text-xs text-[#8a7b68]">{row.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#1c1610]">{materialsTitle(row)}</p>
                        <p className="text-xs font-semibold text-[#8a7b68]">
                          {materialsCountLabel(row)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-2 text-[#6b645b]">
                          <CalendarIcon />
                          <span>
                            {formatDate(row.startsOn)} → {formatDate(row.endsOn)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openPreview(row)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#eadfcf] bg-white px-2.5 text-xs font-semibold text-[#1c1610] hover:bg-[#fbf8f3]"
                          >
                            <EyeIcon />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadPdf(row)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#eadfcf] bg-white px-2.5 text-xs font-semibold text-[#1c1610] hover:bg-[#fbf8f3]"
                          >
                            <PdfIcon />
                            PDF
                          </button>
                          <Link
                            href={`/warranty-desk/customer/${row.id}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2a2118] px-2.5 text-xs font-semibold text-[#f3ece2]"
                          >
                            <PencilIcon />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => void remove(row.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#f0c9c3] bg-[#fff7f6] px-2.5 text-xs font-semibold text-[#8a3424] hover:bg-[#fdeceb]"
                          >
                            <TrashIcon />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview ? (
        <CustomerWarrantyReceiptPreview
          warranty={preview}
          onClose={() => setPreview(null)}
          onUpdated={(next) => setPreview(next)}
        />
      ) : null}
    </div>
  );
}
