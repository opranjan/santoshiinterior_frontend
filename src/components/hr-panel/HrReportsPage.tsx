"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hrApi } from "@/services/crmApi";
import { deptLabel, empCode, inr, initials } from "./hrDisplay";
import HrPageHeader from "./HrPageHeader";

type Row = {
  id: string;
  name: string;
  employeeCode?: string | null;
  department?: string;
  roleTitle?: string | null;
  joinDate?: string | null;
  status?: string;
  workingDays: number;
  present: number;
  absent: number;
  leaves: number;
  payroll: number;
};
type Report = {
  month: string;
  range?: { from: string; to: string };
  kpis?: {
    totalEmployees?: number;
    payrollCost?: number;
    avgAttendance?: number;
    totalLeaves?: number;
    vsLastMonth?: { employees?: number; payroll?: number; attendance?: number; leaves?: number };
  };
  payrollTrend?: Array<{ month: string; amount: number }>;
  departments?: Array<{ department: string; count: number }>;
  leaveTypes?: Array<{ type: string; count: number }>;
  rows?: Row[];
};

const TABS = [
  "Employee Report",
  "Attendance Report",
  "Leave Report",
  "Payroll Report",
  "Department Report",
  "Performance Report",
] as const;

const DEPT_COLORS = ["#6b4f24", "#c4a574", "#d8c09a", "#ead9b8", "#9a7748", "#b89b72"];
const LEAVE_COLORS = ["#3d8fd4", "#c45c5c", "#c4a574", "#2f7a45", "#7a4db8"];

function pct(n?: number) {
  const v = Number(n || 0);
  const up = v >= 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-[#2f7a45]" : "text-[#c45c5c]"}`}>
      {up ? "↑" : "↓"} {Math.abs(v)}% <span className="font-normal text-[#9a8f80]">vs last month</span>
    </span>
  );
}

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(month: string) {
  return new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function conic(items: Array<{ count: number; color: string }>, total: number) {
  if (!total) return "conic-gradient(#eadfcf 0 100%)";
  let acc = 0;
  const parts = items.map((item) => {
    const start = acc;
    acc += (item.count / total) * 100;
    return `${item.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${parts.join(",")})`;
}

function Icon({ name }: { name: string }) {
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, className: "h-5 w-5" };
  if (name === "people")
    return (
      <svg {...p}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  if (name === "pay")
    return (
      <svg {...p}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14h2" />
      </svg>
    );
  if (name === "cal")
    return (
      <svg {...p}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

export default function HrReportsPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Employee Report");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const load = async (m = month) => {
    const row = await hrApi.reports({ month: m });
    setData(row as Report);
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"));
  }, [month]);

  const rows = data?.rows || [];
  const depts = useMemo(() => Array.from(new Set(rows.map((r) => deptLabel(r.department)))), [rows]);
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.trim().toLowerCase();
      if (deptFilter !== "All" && deptLabel(r.department) !== deptFilter) return false;
      if (statusFilter !== "All" && String(r.status || "") !== statusFilter) return false;
      if (q && ![r.name, r.roleTitle, deptLabel(r.department)].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, deptFilter, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const deptItems = (data?.departments || []).map((d, i) => ({ ...d, color: DEPT_COLORS[i % DEPT_COLORS.length] }));
  const deptTotal = deptItems.reduce((s, d) => s + d.count, 0);
  const leaveItems = (data?.leaveTypes || []).map((d, i) => ({ ...d, color: LEAVE_COLORS[i % LEAVE_COLORS.length] }));
  const leaveTotal = leaveItems.reduce((s, d) => s + d.count, 0) || Number(data?.kpis?.totalLeaves || 0);
  const trend = data?.payrollTrend || [];
  const maxPay = Math.max(1, ...trend.map((t) => t.amount));

  const exportCsv = () => {
    const headers = ["Employee", "Department", "Designation", "Joining Date", "Working Days", "Present", "Absent", "Leaves", "Payroll"];
    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        [r.name, deptLabel(r.department), r.roleTitle || "", fmt(r.joinDate), r.workingDays, r.present, r.absent, r.leaves, r.payroll].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HR-${tab.replace(/\s+/g, "-")}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 text-[#1c1610]">
      <HrPageHeader
        crumb="Reports › Overview"
        title="HR Reports"
        subtitle="Get insights on attendance, payroll, employees and more."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
            >
              {Array.from({ length: 8 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                return (
                  <option key={value} value={value}>
                    {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} - {end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </option>
                );
              })}
            </select>
            <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white hover:bg-[#b3915f]">
              ↓ Export Reports
            </button>
          </div>
        }
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Employees", data?.kpis?.totalEmployees ?? 0, "people", data?.kpis?.vsLastMonth?.employees, false],
          ["Total Payroll Cost", inr(Number(data?.kpis?.payrollCost || 0)), "pay", data?.kpis?.vsLastMonth?.payroll, false],
          ["Average Attendance", `${data?.kpis?.avgAttendance ?? 0}%`, "cal", data?.kpis?.vsLastMonth?.attendance, false],
          ["Total Leaves", data?.kpis?.totalLeaves ?? 0, "file", data?.kpis?.vsLastMonth?.leaves, false],
        ].map(([label, value, icon, delta]) => (
          <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c4a574] text-white">
              <Icon name={String(icon)} />
            </span>
            <div>
              <p className="text-[12px] text-[#8a7b68]">{label}</p>
              <p className="text-2xl font-semibold">{value as React.ReactNode}</p>
              {pct(delta as number)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Monthly Payroll Cost</h2>
            <span className="rounded-full bg-[#f4efe6] px-2.5 py-1 text-[11px] text-[#8a7b68]">Last 6 Months</span>
          </div>
          <div className="flex h-44 items-end gap-3">
            {trend.map((item) => (
              <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-8 rounded-t-md bg-[#c4a574]" style={{ height: `${Math.max(8, (item.amount / maxPay) * 100)}%` }} />
                <span className="text-[10px] text-[#8a7b68]">{monthLabel(item.month).split(" ")[0]}</span>
              </div>
            ))}
            {!trend.length ? <p className="text-sm text-[#8a7b68]">No payroll trend yet.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <h2 className="mb-4 text-base font-semibold">Employee Count by Department</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-[120px] w-[120px] shrink-0 rounded-full" style={{ background: conic(deptItems, deptTotal) }}>
              <div className="absolute inset-[26px] grid place-items-center rounded-full bg-white dark:bg-[#161411]">
                <strong className="text-xl leading-none">{deptTotal}</strong>
                <span className="text-[10px] text-[#8a7b68]">Total</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-[12px]">
              {deptItems.map((d) => (
                <li key={d.department} className="flex justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {deptLabel(d.department)}
                  </span>
                  <span>
                    {d.count} ({deptTotal ? Math.round((d.count / deptTotal) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Leave Type Breakdown</h2>
            <span className="text-[11px] text-[#8a7b68]">This Month</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-[120px] w-[120px] shrink-0 rounded-full" style={{ background: conic(leaveItems, leaveTotal) }}>
              <div className="absolute inset-[26px] grid place-items-center rounded-full bg-white dark:bg-[#161411]">
                <strong className="text-xl leading-none">{leaveTotal}</strong>
                <span className="text-[10px] text-[#8a7b68]">Total</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-[12px]">
              {(leaveItems.length ? leaveItems : [{ type: "No leaves", count: 0, color: "#eadfcf" }]).map((d) => (
                <li key={d.type} className="flex justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.type.replace(/_/g, " ")}
                  </span>
                  <span>
                    {d.count} ({leaveTotal ? Math.round((d.count / leaveTotal) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setTab(item);
              setPage(1);
            }}
            className={`inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium ${
              tab === item ? "bg-[#c4a574] text-white" : "border border-[#eadfcf] bg-white text-[#5c5146]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search employee..."
            className="h-10 min-w-[180px] flex-1 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm"
          />
          <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
            <option value="All">All Departments</option>
            {depts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
            <option value="All">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white"
          >
            Generate Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.08em] text-[#8a7b68]">
                <th className="pb-2">#</th>
                <th className="pb-2">Employee</th>
                <th className="pb-2">Department</th>
                {tab !== "Department Report" ? <th className="pb-2">Designation</th> : null}
                {tab === "Employee Report" || tab === "Payroll Report" ? <th className="pb-2">Joining Date</th> : null}
                {tab !== "Payroll Report" && tab !== "Leave Report" ? <th className="pb-2">Total Working Days</th> : null}
                {tab !== "Leave Report" && tab !== "Payroll Report" ? <th className="pb-2">Present</th> : null}
                {tab === "Attendance Report" || tab === "Employee Report" ? <th className="pb-2">Absent</th> : null}
                {tab !== "Payroll Report" ? <th className="pb-2">Leaves</th> : null}
                {tab !== "Attendance Report" && tab !== "Leave Report" ? <th className="pb-2">Payroll Cost (₹)</th> : null}
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.id} className="border-t border-[#f0e6d8]">
                  <td className="py-3 text-[#8a7b68]">{(page - 1) * pageSize + i + 1}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#efe4d2] text-[10px] font-semibold text-[#6b4f24]">{initials(r.name)}</span>
                      <span>
                        <span className="block font-medium">{r.name}</span>
                        <span className="text-[11px] text-[#8a7b68]">{r.employeeCode || empCode(r.id, (page - 1) * pageSize + i)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3">{deptLabel(r.department)}</td>
                  {tab !== "Department Report" ? <td className="py-3">{r.roleTitle || "—"}</td> : null}
                  {tab === "Employee Report" || tab === "Payroll Report" ? <td className="py-3">{fmt(r.joinDate)}</td> : null}
                  {tab !== "Payroll Report" && tab !== "Leave Report" ? <td className="py-3">{r.workingDays}</td> : null}
                  {tab !== "Leave Report" && tab !== "Payroll Report" ? <td className="py-3">{r.present}</td> : null}
                  {tab === "Attendance Report" || tab === "Employee Report" ? <td className="py-3">{r.absent}</td> : null}
                  {tab !== "Payroll Report" ? <td className="py-3">{r.leaves}</td> : null}
                  {tab !== "Attendance Report" && tab !== "Leave Report" ? <td className="py-3">{r.payroll.toLocaleString("en-IN")}</td> : null}
                  <td className="py-3">
                    <Link href={`/hr/payroll/slips?employee=${r.id}`} className="text-xs font-semibold text-[#c4a574]">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[#8a7b68]">No rows for this report. Add employees and attendance first.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[#8a7b68]">
          <span>
            Showing {filtered.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} employees
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg border border-[#eadfcf] px-2 disabled:opacity-40">
              ‹
            </button>
            {Array.from({ length: pages }).slice(0, 5).map((_, i) => (
              <button key={i} type="button" onClick={() => setPage(i + 1)} className={`h-8 min-w-8 rounded-lg px-2 ${page === i + 1 ? "bg-[#c4a574] text-white" : "border border-[#eadfcf]"}`}>
                {i + 1}
              </button>
            ))}
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg border border-[#eadfcf] px-2 disabled:opacity-40">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
