"use client";

import React, { useEffect, useState } from "react";
import { rfqApi, type RfqDto } from "@/services/crmApi";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PublicRfqForm({ token }: { token: string }) {
  const [row, setRow] = useState<RfqDto | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    rfqApi
      .getPublic(token)
      .then(setRow)
      .catch((err) => setError(err instanceof Error ? err.message : "RFQ not found"));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }
  if (!row) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-500">Loading RFQ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#E85D75]">{row.code}</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-800">{row.name}</h1>
        <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <p>Project: {row.project?.name || "—"}</p>
          <p>Expected delivery: {formatDate(row.expectedDelivery)}</p>
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">UOM</th>
                <th className="px-3 py-2 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {(row.items || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    No items on this RFQ.
                  </td>
                </tr>
              ) : (
                (row.items || []).map((item, index) => (
                  <tr key={item.id || index} className="border-t border-gray-100">
                    <td className="px-3 py-2">{item.name || "—"}</td>
                    <td className="px-3 py-2">{item.code || "—"}</td>
                    <td className="px-3 py-2">{item.uom || "—"}</td>
                    <td className="px-3 py-2">{item.qty ?? 0}</td>
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
