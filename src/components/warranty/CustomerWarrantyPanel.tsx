"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import {
  warrantyCoverageApi,
  type CustomerWarrantyDto,
} from "@/services/crmApi";
import CustomerWarrantyReceiptPreview from "@/components/warranty/CustomerWarrantyReceiptPreview";
import { openWarrantyReceiptPrintWindow } from "@/lib/warrantyReceiptPrint";

const fieldClass =
  "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

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
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export default function CustomerWarrantyPanel() {
  const [rows, setRows] = useState<CustomerWarrantyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer warranty, project, client…"
          className={`${fieldClass} max-w-md`}
        />
        <Link
          href="/warranty-desk/customer/new"
          className="inline-flex h-10 items-center rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5]"
        >
          + Customer warranty
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#1c1610] text-[11px] uppercase tracking-[0.12em] text-[#e8d5b5]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project / Client</th>
                <th className="px-4 py-3 text-left font-medium">Materials</th>
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#8a7b68]">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#8a7b68]">
                    No customer warranties yet.{" "}
                    <Link href="/warranty-desk/customer/new" className="font-semibold text-[#9a7748]">
                      Add materials
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[#f0e8db] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                        {row.project?.name || "—"}
                        {row.project?.clientName ? ` · ${row.project.clientName}` : ""}
                      </p>
                      <p className="text-xs text-[#8a7b68]">{row.title}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">
                      <p>{materialsLabel(row)}</p>
                      <p className="text-xs text-[#8a7b68]">
                        {(row.coverageItems || []).length} material
                        {(row.coverageItems || []).length === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#6b645b]">
                      {formatDate(row.startsOn)} → {formatDate(row.endsOn)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openPreview(row)}
                          className="rounded-lg border border-[#eadfcf] px-2.5 py-1.5 text-xs font-semibold text-[#1c1610]"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadPdf(row)}
                          className="rounded-lg border border-[#c4a574] px-2.5 py-1.5 text-xs font-semibold text-[#9a7748]"
                        >
                          PDF
                        </button>
                        <Link
                          href={`/warranty-desk/customer/${row.id}`}
                          className="rounded-lg bg-[#1c1610] px-2.5 py-1.5 text-xs font-semibold text-[#e8d5b5]"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#8a3424]"
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

      {preview ? (
        <CustomerWarrantyReceiptPreview warranty={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
