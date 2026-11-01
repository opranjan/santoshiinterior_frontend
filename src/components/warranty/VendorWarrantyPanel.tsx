"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import { warrantyCoverageApi, type VendorWarrantyDto } from "@/services/crmApi";

const fieldClass =
  "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

type StatusKey = "active" | "expiring" | "expired";
type PeriodFilter = "all" | StatusKey;

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function warrantyStatus(row: VendorWarrantyDto): StatusKey {
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

export default function VendorWarrantyPanel() {
  const [rows, setRows] = useState<VendorWarrantyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const load = async () => {
    const data = await warrantyCoverageApi.listVendor({ search: search || undefined });
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

  const vendorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      const key = row.vendorId || row.vendorName || row.vendor?.name || "";
      const label = row.vendorName || row.vendor?.name || "Vendor";
      if (key) map.set(key, label);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (projectFilter !== "all" && row.projectId !== projectFilter) return false;
      if (periodFilter !== "all" && warrantyStatus(row) !== periodFilter) return false;
      if (vendorFilter !== "all") {
        const key = row.vendorId || row.vendorName || row.vendor?.name || "";
        if (key !== vendorFilter) return false;
      }
      return true;
    });
  }, [rows, projectFilter, vendorFilter, periodFilter]);

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

  const remove = async (id: string) => {
    if (!window.confirm("Delete this vendor warranty?")) return;
    try {
      await warrantyCoverageApi.removeVendor(id);
      toastSuccess("Deleted.");
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
            placeholder="Search material, vendor, project…"
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
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className={`${fieldClass} w-auto min-w-[140px]`}
          >
            <option value="all">All Vendors</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
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
          href="/warranty-desk/vendor/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
        >
          + Vendor warranty
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
            Total Materials
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">Active</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.active}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">
            Expiring (30 Days)
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1610] dark:text-[#f3ece2]">
            {stats.expiring}
          </p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">Expired</p>
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
                <th className="px-4 py-3.5 text-left font-medium">Material</th>
                <th className="px-4 py-3.5 text-left font-medium">Vendor</th>
                <th className="px-4 py-3.5 text-left font-medium">Project</th>
                <th className="px-4 py-3.5 text-left font-medium">Until</th>
                <th className="px-4 py-3.5 text-left font-medium">Status</th>
                <th className="px-4 py-3.5 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#8a7b68]">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#8a7b68]">
                    No vendor warranties match these filters.{" "}
                    <Link href="/warranty-desk/vendor/new" className="font-semibold text-[#9a7748]">
                      Add materials
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[#f0e8db] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#1c1610] dark:text-[#f3ece2]">{row.materialName}</p>
                      <p className="text-xs text-[#8a7b68]">
                        {row.materialCategory || row.coverageSummary || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">
                      {row.vendorName || row.vendor?.name || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">
                      {row.project?.name || "—"}
                      {row.project?.clientName ? ` · ${row.project.clientName}` : ""}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b645b]">{formatDate(row.endsOn)}</td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={warrantyStatus(row)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/warranty-desk/vendor/${row.id}`}
                          className="rounded-lg bg-[#1c1610] px-2.5 py-1.5 text-xs font-semibold text-[#e8d5b5]"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="rounded-lg border border-[#f0c9c3] px-2.5 py-1.5 text-xs font-semibold text-[#8a3424]"
                        >
                          Delete
                        </button>
                      </div>
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
