"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import NewInvoiceModal from "@/components/accounting/NewInvoiceModal";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import { formatDate, money } from "@/lib/invoiceMath";
import { invoicesApi, type InvoiceDto } from "@/services/crmApi";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "GENERATED", label: "Generated" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function AccountingInvoices() {
  const router = useRouter();
  const [items, setItems] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const data = await invoicesApi.list({
      limit: 100,
      search,
      status: statusFilter || undefined,
    });
    setItems(data.items || []);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toastError(err instanceof Error ? err.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await invoicesApi.remove(deleteId);
      toastSuccess("Invoice deleted.");
      setDeleteId(null);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">Accounting</p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Invoice
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">Create a project invoice, then add catalog items and generate it.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-11 w-fit items-center rounded-xl bg-[#7a4a24] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#6b3e1f]"
        >
          + Create invoice
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, client, project"
          className="h-11 w-full max-w-sm rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 w-44 rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm"
        >
          {STATUSES.map((row) => (
            <option key={row.value || "all"} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fdfbf7]">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#eadfcf] bg-[#fbf8f3] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
              <tr>
                {["Invoice", "Project", "Bill To", "Amount", "Date", "Status", ""].map((h) => (
                  <th key={h || "a"} className="whitespace-nowrap px-4 py-3">
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
                    No invoices yet. Create one for a project.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[#eadfcf]/70 last:border-0 hover:bg-[#f6efe4]"
                    onClick={() => router.push(`/accounting/invoices/${row.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#1c1610]">{row.code}</td>
                    <td className="px-4 py-3.5 text-[#5c472c]">{row.projectName || row.project?.name || "—"}</td>
                    <td className="max-w-[240px] truncate px-4 py-3.5 text-[#8a7b68]">{row.billTo || row.clientName || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">{money(row.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#8a7b68]">{formatDate(row.invoiceDate)}</td>
                    <td className="px-4 py-3.5 text-[#8a7b68]">{row.status}</td>
                    <td className="px-4 py-3.5 text-end" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setDeleteId(row.id)} className="text-xs text-rose-600">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {deleteId ? (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <h3 className="text-lg font-semibold text-[#1c1610]">Delete invoice?</h3>
            <p className="mt-2 text-sm text-[#8a7b68]">This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteId(null)} className="h-10 px-4 text-sm text-[#6b645b]">
                Cancel
              </button>
              <button type="button" onClick={() => void remove()} className="h-10 rounded-lg bg-rose-600 px-4 text-sm text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
