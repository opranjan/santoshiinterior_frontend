"use client";

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
  "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

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

function materialsLabel(row: CustomerWarrantyDto) {
  const items = row.coverageItems || [];
  if (!items.length) return row.coverageSummary || "No materials";
  const names = items.map((item) => item.title).filter(Boolean);
  if (!names.length) return "Materials";
  if (names.length === 1) return names[0];
  return `${names[0]} / ${names.length} materials`;
}

function materialsCountLabel(row: CustomerWarrantyDto) {
  const n = (row.coverageItems || []).length;
  if (!n) return "0 materials";
  return `${n} material${n === 1 ? "" : "s"}`;
}

function initials(text: string) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function StatusPill({ status }: { status: StatusKey }) {
  const map = {
    active: "bg-[#eaf6ee] text-[#1f7a45] ring-[#cfe8d7]",
    expiring: "bg-[#fff4e5] text-[#b76a1a] ring-[#f3dfc0]",
    expired: "bg-[#fdeceb] text-[#b42318] ring-[#f3d1cd]",
  } as const;
  const label = status === "active" ? "Active" : status === "expiring" ? "Expiring" : "Expired";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${map[status]}`}
    >
      {label}
    </span>
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
      <path d="M9 13h6M9 17h4" />
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#9a7748]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
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
    for (const row of rows) {
      const status = warrantyStatus(row);
      if (status === "active") active += 1;
      else if (status === "expiring") expiring += 1;
      else expired += 1;
    }
    return { total: rows.length, active, expiring, expired };
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer warranty, project, client…"
            className={`${fieldClass} min-w-[220px] flex-1 xl:max-w-sm`}
          />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={`${fieldClass} w-auto min-w-[140px]`}
          >
            <option value="all">All Projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className={`${fieldClass} w-auto min-w-[140px]`}
          >
            <option value="all">All Clients</option>
            {clientOptions.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className={`${fieldClass} w-auto min-w-[130px]`}
          >
            <option value="all">All Period</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <Link
          href="/warranty-desk/customer/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
        >
          + Customer warranty
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
            Total Warranties
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">Active</p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf6ee] text-sm text-[#1f7a45]">
              ✓
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.active}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
              Expiring (30 Days)
            </p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#fff4e5] text-sm text-[#b76a1a]">
              !
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.expiring}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">Expired</p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#fdeceb] text-sm text-[#b42318]">
              ×
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.expired}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#1c1610] text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5]">
              <tr>
                <th className="px-4 py-3.5 text-left font-medium">Project / Client</th>
                <th className="px-4 py-3.5 text-left font-medium">Materials</th>
                <th className="px-4 py-3.5 text-left font-medium">Warranty Period</th>
                <th className="px-4 py-3.5 text-left font-medium">Status</th>
                <th className="px-4 py-3.5 text-left font-medium">Action</th>
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
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[#f0e8db] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3ebe0] text-xs font-bold text-[#7a5c34] ring-1 ring-[#eadfcf]">
                            {initials(projectName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                              {projectName}
                              {row.project?.clientName ? ` · ${row.project.clientName}` : ""}
                            </p>
                            <p className="truncate text-xs text-[#8a7b68]">{row.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                          {materialsLabel(row)}
                        </p>
                        <p className="text-xs text-[#8a7b68]">{materialsCountLabel(row)}</p>
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
                            title="Preview"
                            onClick={() => void openPreview(row)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#eadfcf] bg-white px-2.5 text-xs font-semibold text-[#1c1610] hover:bg-[#fbf8f3]"
                          >
                            <EyeIcon />
                            Preview
                          </button>
                          <button
                            type="button"
                            title="Download PDF"
                            onClick={() => void downloadPdf(row)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#eadfcf] bg-white px-2.5 text-xs font-semibold text-[#9a7748] hover:bg-[#fbf8f3]"
                          >
                            <PdfIcon />
                            PDF
                          </button>
                          <Link
                            href={`/warranty-desk/customer/${row.id}`}
                            title="Edit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1c1610] px-2.5 text-xs font-semibold text-[#e8d5b5]"
                          >
                            <PencilIcon />
                            Edit
                          </Link>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => void remove(row.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f0c9c3] bg-white text-[#8a3424] hover:bg-[#fdeceb]"
                          >
                            <TrashIcon />
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
        <CustomerWarrantyReceiptPreview warranty={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
