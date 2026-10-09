"use client";

import React, { useEffect, useState } from "react";
import { hrApi } from "@/services/crmApi";
import { mapLeave } from "@/lib/crmMappers";
import HrPageHeader from "./HrPageHeader";

type Leave = ReturnType<typeof mapLeave>;

export default function HrLeavesPage() {
  const [items, setItems] = useState<Leave[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await hrApi.listLeaves({ limit: 100 });
    setItems((data.items || []).map((row) => mapLeave(row)));
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load leaves"));
  }, []);

  const setStatus = async (id: string, status: string) => {
    await hrApi.updateLeave(id, { status });
    await load();
  };

  return (
    <div className="space-y-5">
      <HrPageHeader crumb="HR › Leave Requests" title="Leave Requests" subtitle="Approve or reject employee leave" />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/60 text-[11px] uppercase tracking-[0.12em] text-[#8a7b68]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-[#eadfcf]">
                <td className="px-4 py-3 font-medium text-[#1c1610] dark:text-[#f3ece2]">{row.name}</td>
                <td className="px-4 py-3">{row.type}</td>
                <td className="px-4 py-3">{row.from}</td>
                <td className="px-4 py-3">{row.to}</td>
                <td className="px-4 py-3">{row.days}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  {row.status === "Pending" ? (
                    <div className="flex gap-2">
                      <button type="button" className="text-xs font-semibold text-[#2f6b3a]" onClick={() => void setStatus(row.id, "APPROVED")}>
                        Approve
                      </button>
                      <button type="button" className="text-xs font-semibold text-[#a33]" onClick={() => void setStatus(row.id, "REJECTED")}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#8a7b68]">
                  No leave requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
