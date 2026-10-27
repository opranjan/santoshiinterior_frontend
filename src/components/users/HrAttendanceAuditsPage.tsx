"use client";

import React, { useCallback, useEffect, useState } from "react";
import { hrApi } from "@/services/crmApi";

type AuditRow = {
  id: string;
  status: "ALL_OK" | "NOT_OK";
  remarks: string;
  updatedAt?: string;
  createdAt?: string;
  auditor?: { name?: string } | null;
  employee?: {
    name?: string;
    employeeCode?: string | null;
    department?: string;
    store?: string | null;
  } | null;
  attendance?: {
    date?: string;
    status?: string;
    checkIn?: string | null;
    checkOut?: string | null;
  } | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function HrAttendanceAuditsPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState({ allOk: 0, notOk: 0, total: 0 });
  const [status, setStatus] = useState<"all" | "ALL_OK" | "NOT_OK">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await hrApi.listAttendanceAudits({
        limit: 100,
        ...(status === "all" ? {} : { status }),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      setItems((data.items || []) as AuditRow[]);
      setSummary({
        allOk: Number(data.summary?.allOk || 0),
        notOk: Number(data.summary?.notOk || 0),
        total: Number(data.summary?.total || data.total || 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HR audits");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7748]">
          Admin › Super Admin
        </p>
        <h1
          className="mt-1 font-serif text-3xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          HR attendance audits
        </h1>
        <p className="mt-1 text-sm text-[#8a7b68]">
          Feedback from HR after they listen to duty recordings and review attendance.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">Received</p>
          <p className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#2f7a45]">All okay</p>
          <p className="mt-1 font-serif text-2xl text-[#2f7a45]">{summary.allOk}</p>
        </div>
        <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#b42318]">Not okay</p>
          <p className="mt-1 font-serif text-2xl text-[#b42318]">{summary.notOk}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee or remarks"
          className="h-11 flex-1 rounded-xl border border-[#eadfcf] bg-white px-4 text-sm outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
        >
          <option value="all">All statuses</option>
          <option value="ALL_OK">All okay</option>
          <option value="NOT_OK">Not okay</option>
        </select>
      </div>

      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] dark:border-[#3a342c]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7f1e8] text-[11px] uppercase tracking-[0.14em] text-[#8a7b68] dark:bg-[#1c1814]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Attendance</th>
              <th className="px-4 py-3">HR status</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3">From</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eadfcf] bg-white dark:divide-[#3a342c] dark:bg-[#161411]">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-[#8a7b68]" colSpan={6}>
                  Loading audits…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-[#8a7b68]" colSpan={6}>
                  No HR audits yet. After HR listens to recordings they send All okay or Not okay here.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">
                      {row.employee?.name || "Employee"}
                    </p>
                    <p className="text-xs text-[#8a7b68]">
                      {row.employee?.employeeCode || "—"} · {row.employee?.store || "—"} ·{" "}
                      {row.employee?.department || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#1c1610] dark:text-[#f3ece2]">
                    {fmtDate(row.attendance?.date)}
                  </td>
                  <td className="px-4 py-3 text-[#6b645b]">
                    {row.attendance?.status || "—"}
                    <p className="text-xs">
                      {row.attendance?.checkIn || "—"} – {row.attendance?.checkOut || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        row.status === "ALL_OK"
                          ? "bg-[#e7f6ec] text-[#2f7a45]"
                          : "bg-[#fde8e8] text-[#b42318]"
                      }`}
                    >
                      {row.status === "ALL_OK" ? "All okay" : "Not okay"}
                    </span>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-[#1c1610] dark:text-[#f3ece2]">
                    {row.remarks || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8a7b68]">
                    {row.auditor?.name || "HR"}
                    <p>{fmtWhen(row.updatedAt || row.createdAt)}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
