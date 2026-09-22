"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReceiveAdhocModal from "@/components/procurement/ReceiveAdhocModal";
import AcceptancePreviewDrawer from "@/components/procurement/AcceptancePreviewDrawer";
import { toastError } from "@/components/ui/toast/ToastHost";
import { purchaseOrdersApi, type PurchaseOrderDto } from "@/services/crmApi";

const PINK = "#E85D75";

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

  const pill = (value: typeof status, label: string) => (
    <button
      type="button"
      onClick={() => setStatus(value)}
      className={`inline-flex h-9 items-center rounded-full border px-3 text-sm ${
        status === value ? "border-[#F4C4CC] bg-[#FFF5F7] font-medium text-[#E85D75]" : "border-gray-200 text-gray-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-xl font-semibold text-gray-800">Acceptance</h2>
          <button
            type="button"
            onClick={() => setKind("PO")}
            className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-medium ${
              kind === "PO" ? "bg-[#ECFDF5] text-[#15803D]" : "text-gray-500"
            }`}
          >
            ▤ Purchase Orders
          </button>
          <button
            type="button"
            onClick={() => setKind("WO")}
            className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-medium ${
              kind === "WO" ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-500"
            }`}
          >
            ▤ Work Orders
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
            ⇆ Filters
          </button>
          <button
            type="button"
            onClick={() => setAdhocOpen(true)}
            className="h-10 rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: PINK }}
          >
            + Receive Ad-hoc
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {pill("PENDING", "Pending")}
        {pill("PARTIAL", "Partial")}
        {pill("ACCEPTED", "Accepted")}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">S.No.</th>
              <th className="px-4 py-3 font-medium">PO Number</th>
              <th className="px-4 py-3 font-medium">PO Name</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Delivery Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No {status.toLowerCase()} {kind === "WO" ? "work" : "purchase"} orders.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  onClick={() => router.push(`/operations/procurement/acceptances/${row.id}`)}
                >
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-gray-800">
                      {row.code}
                      <button
                        type="button"
                        className="text-[#2563EB]"
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
                  <td className="px-4 py-3 text-gray-700">{row.title || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{row.project?.name || "Unknown Project"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.vendorRecord?.name || row.vendor}</td>
                  <td className={`px-4 py-3 ${isOverdue(row.expectedDate) ? "font-medium text-[#DC2626]" : "text-gray-700"}`}>
                    {formatDate(row.expectedDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
