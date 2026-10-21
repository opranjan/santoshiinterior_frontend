"use client";

import React, { useEffect, useState } from "react";
import { hrApi } from "@/services/crmApi";
import HrPageHeader from "./HrPageHeader";

type CheckInRequest = {
  id: string;
  name: string;
  department: string;
  employeeCode: string;
  date: string;
  requestedTime: string;
  reason: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
};

function formatDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value?.slice(0, 10) || "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HrCheckInRequestsPage() {
  const [items, setItems] = useState<CheckInRequest[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [confirm, setConfirm] = useState<{ row: CheckInRequest; status: "APPROVED" | "REJECTED" } | null>(null);

  const load = async () => {
    const data = await hrApi.listAttendanceRequests({ limit: 100 });
    setItems(
      (data.items || []).map((row) => ({
        id: String(row.id || ""),
        name: String(row.name || ""),
        department: String(row.department || ""),
        employeeCode: String(row.employeeCode || ""),
        date: String(row.date || ""),
        requestedTime: String(row.requestedTime || ""),
        reason: String(row.reason || ""),
        status: String(row.status || "PENDING"),
        latitude: typeof row.latitude === "number" ? row.latitude : null,
        longitude: typeof row.longitude === "number" ? row.longitude : null,
      }))
    );
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load requests"));
  }, []);

  const setStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setSaving(id + status);
    setError("");
    try {
      await hrApi.reviewAttendanceRequest(id, { status });
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="space-y-5">
      <HrPageHeader
        crumb="HR › Check-in Requests"
        title="Check-in Requests"
        subtitle="Approve off-site check-ins so they count in attendance"
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/60 text-[11px] uppercase tracking-[0.12em] text-[#8a7b68]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Requested time</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-[#eadfcf]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{row.name}</p>
                  <p className="text-xs text-[#8a7b68]">{row.employeeCode || row.department || "—"}</p>
                </td>
                <td className="px-4 py-3">{formatDay(row.date)}</td>
                <td className="px-4 py-3 font-semibold">{row.requestedTime || "—"}</td>
                <td className="max-w-[280px] px-4 py-3 text-[#5c5146]">{row.reason || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.status === "APPROVED"
                        ? "bg-[#e8f6ec] text-[#2f7a45]"
                        : row.status === "REJECTED"
                          ? "bg-[#fde8e8] text-[#e11d48]"
                          : "bg-[#fff3d6] text-[#b45309]"
                    }`}
                  >
                    {row.status === "PENDING" ? "Pending" : row.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={Boolean(saving)}
                        className="text-xs font-semibold text-[#2f6b3a] disabled:opacity-50"
                        onClick={() => setConfirm({ row, status: "APPROVED" })}
                      >
                        {saving === `${row.id}APPROVED` ? "Saving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(saving)}
                        className="text-xs font-semibold text-[#a33] disabled:opacity-50"
                        onClick={() => setConfirm({ row, status: "REJECTED" })}
                      >
                        {saving === `${row.id}REJECTED` ? "Saving…" : "Reject"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8a7b68]">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#8a7b68]">
                  No off-site check-in requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-[#fbf7f2] p-5 shadow-[0_24px_60px_rgba(40,24,8,0.22)]">
            <h3 className="text-lg font-semibold text-[#1c1610]">
              {confirm.status === "APPROVED" ? "Approve check-in?" : "Reject check-in?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5c5146]">
              {confirm.status === "APPROVED"
                ? `Approve ${confirm.row.name || "this employee"}’s off-site check-in at ${confirm.row.requestedTime || "the requested time"}? It will count in attendance.`
                : `Reject ${confirm.row.name || "this employee"}’s off-site check-in? Attendance will not be marked.`}
            </p>
            {confirm.row.reason ? (
              <p className="mt-3 rounded-xl border border-[#eadfcf] bg-white px-3 py-2 text-sm text-[#5c5146]">
                {confirm.row.reason}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(saving)}
                onClick={() => setConfirm(null)}
                className="inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(saving)}
                onClick={() => void setStatus(confirm.row.id, confirm.status)}
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60 ${
                  confirm.status === "APPROVED" ? "bg-[#2f7a45]" : "bg-[#c44536]"
                }`}
              >
                {saving
                  ? "Saving…"
                  : confirm.status === "APPROVED"
                    ? "Confirm approve"
                    : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
