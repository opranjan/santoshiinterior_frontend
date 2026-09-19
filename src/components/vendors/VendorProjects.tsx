"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  projectsApi,
  vendorsApi,
  type VendorDto,
  type VendorProjectAssignment,
  type VendorProjectTotals,
} from "@/services/crmApi";
import { vendorDisplayId } from "./VendorDataHeader";

const emptyTotals = (): VendorProjectTotals => ({
  estimatedExpenses: 0,
  totalPayables: 0,
  totalDisbursed: 0,
  payableDues: 0,
});

const formatMoney = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toLocaleString("en-IN");

export default function VendorProjects({ vendorId }: { vendorId: string }) {
  const [vendor, setVendor] = useState<VendorDto | null>(null);
  const [items, setItems] = useState<VendorProjectAssignment[]>([]);
  const [totals, setTotals] = useState<VendorProjectTotals>(emptyTotals);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await vendorsApi.projects(vendorId);
      setVendor(data.vendor);
      setItems(data.items || []);
      setTotals(data.totals || emptyTotals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [vendorId]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) =>
      [row.project.name, row.project.clientName, row.project.store?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [items, search]);

  const unassign = async (projectId: string) => {
    try {
      const data = await vendorsApi.unassignProject(vendorId, projectId);
      setItems(data.items || []);
      setTotals(data.totals || emptyTotals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unassign project");
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading vendor projects...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/operations/vendors/${vendorId}`}
            className="inline-flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white/90"
          >
            <span className="text-2xl font-normal text-gray-500">‹</span>
            Vendor Projects
          </Link>
          <button
            type="button"
            onClick={() => setHelpOpen((prev) => !prev)}
            className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E85D75] text-[11px] font-bold text-white"
            aria-label="Vendor projects help"
          >
            ?
            {helpOpen ? (
              <span className="absolute left-6 top-0 z-20 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-normal text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                Assign CRM projects to this vendor to track expenses, payables, and dues.
              </span>
            ) : null}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-44 rounded-full border border-gray-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="inline-flex h-10 items-center rounded-full bg-[#E85D75] px-4 text-sm font-medium text-white hover:bg-[#d64c66]"
          >
            Assign Project
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="More actions"
            >
              ⋮
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void load();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200"
                >
                  Refresh
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-[#F4D0D6] bg-[#fff7f8] px-4 py-3 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <p className="text-sm font-semibold text-[#2563EB]">ID- {vendor ? vendorDisplayId(vendor.id) : "—"}</p>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-white/90">
            {vendor?.name || "—"}
          </p>
          <p className="text-xs text-gray-500">Category: {vendor?.category || "—"}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Metric label="Estimated Expenses:" value={totals.estimatedExpenses} color="text-blue-600" />
          <Metric label="Total Payables:" value={totals.totalPayables} color="text-green-600" />
          <Metric label="Total Disbursed:" value={totals.totalDisbursed} color="text-red-500" />
          <Metric label="Payable Dues:" value={totals.payableDues} color="text-red-500" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">
          No project is assigned to this Vendor yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          {visible.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0 dark:border-gray-800"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{row.project.name}</p>
                <p className="text-xs text-gray-500">
                  {row.project.clientName || "No client"}
                  {row.project.store?.name ? ` · ${row.project.store.name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void unassign(row.project.id)}
                className="text-sm font-medium text-[#E85D75]"
              >
                Unassign
              </button>
            </div>
          ))}
        </div>
      )}

      <AssignProjectModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        assignedIds={items.map((row) => row.project.id)}
        onAssign={async (projectId) => {
          const data = await vendorsApi.assignProject(vendorId, projectId);
          setItems(data.items || []);
          setTotals(data.totals || emptyTotals());
        }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{formatMoney(value)}</p>
    </div>
  );
}

function AssignProjectModal({
  isOpen,
  onClose,
  assignedIds,
  onAssign,
}: {
  isOpen: boolean;
  onClose: () => void;
  assignedIds: string[];
  onAssign: (projectId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Array<{ id: string; name: string; clientName?: string | null }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSelected([]);
    setError("");
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          const data = await projectsApi.list({
            page: 1,
            limit: 50,
            search: query.trim() || undefined,
          });
          const rows = (data.items || []) as Array<{ id: string; name: string; clientName?: string | null }>;
          setOptions(rows.filter((row) => !assignedIds.includes(row.id)));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load projects");
        } finally {
          setLoading(false);
        }
      })();
    }, 200);
    return () => clearTimeout(timer);
  }, [assignedIds, isOpen, query]);

  const save = async () => {
    if (!selected.length) return;
    try {
      setSaving(true);
      setError("");
      for (const id of selected) await onAssign(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg p-6 shadow-xl"
      showCloseButton={false}
      overlayClassName="fixed inset-0 h-full w-full bg-black/20"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Assign Project</h3>
        <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400" aria-label="Close">
          ×
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects"
        className="mb-3 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900"
      />
      {error ? <p className="mb-3 text-sm text-error-500">{error}</p> : null}
      <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">Loading projects...</p>
        ) : options.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">No projects available to assign.</p>
        ) : (
          options.map((row) => {
            const checked = selected.includes(row.id);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                  )
                }
                className="flex w-full items-center gap-3 border-t border-gray-50 px-3 py-2.5 text-left first:border-t-0 dark:border-gray-800"
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                    checked ? "border-[#E85D75] bg-[#E85D75] text-white" : "border-[#E85D75]"
                  }`}
                >
                  {checked ? "✓" : null}
                </span>
                <span>
                  <span className="block text-sm text-gray-800 dark:text-white/80">{row.name}</span>
                  <span className="block text-xs text-gray-400">{row.clientName || "No client"}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-sm text-gray-500">
          Cancel
        </button>
        <button
          type="button"
          disabled={!selected.length || saving}
          onClick={() => void save()}
          className="h-10 rounded-lg bg-[#E85D75] px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? "Assigning..." : "Assign"}
        </button>
      </div>
    </Modal>
  );
}
