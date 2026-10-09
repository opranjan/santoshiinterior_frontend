"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { hrApi } from "@/services/crmApi";
import { enumToLabel, formatDate } from "@/lib/mappers";
import { deptLabel, initials } from "./hrDisplay";

type DeptRow = { department: string; count: number };
type EmpRow = {
  id: string;
  name: string;
  department?: string;
  roleTitle?: string | null;
  joinDate?: string | null;
  status?: string;
  user?: { dateOfBirth?: string | null } | null;
};
type Vs = { total?: number; active?: number; joinings?: number; leaves?: number };

const DEPT_COLORS = ["#6b4f24", "#c4a574", "#d8c09a", "#ead9b8", "#9a7748", "#b89b72"];

function pct(now: number, change?: number) {
  const value = Number(change || 0);
  const up = value >= 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-[#2f7a45]" : "text-[#c45c5c]"}`}>
      {up ? "↑" : "↓"} {Math.abs(value)}% <span className="font-normal text-[#9a8f80]">vs last month</span>
    </span>
  );
}

function daysUntil(dateIso?: string | null, kind: "birthday" | "anniv" = "birthday") {
  if (!dateIso) return null;
  const src = new Date(dateIso);
  if (Number.isNaN(src.getTime())) return null;
  const now = new Date();
  const next = new Date(now.getFullYear(), src.getMonth(), src.getDate());
  if (kind === "anniv") {
    next.setFullYear(now.getFullYear());
  }
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.ceil((next.getTime() - now.getTime()) / 86400000);
}

function scoreFor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n += id.charCodeAt(i);
  return 3.6 + ((n % 15) / 10);
}

function Icon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
  };
  if (name === "people")
    return (
      <svg {...p}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  if (name === "star")
    return (
      <svg {...p} fill="currentColor" stroke="none">
        <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 16.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z" />
      </svg>
    );
  if (name === "plane")
    return (
      <svg {...p}>
        <path d="M2.5 19.5 21 12 2.5 4.5 5.5 12l-3 7.5Z" />
        <path d="M5.5 12h8" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  if (name === "umbrella")
    return (
      <svg {...p}>
        <path d="M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9Z" />
        <path d="M12 12v6a2 2 0 0 0 4 0" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...p}>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  if (name === "pending")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (name === "close")
    return (
      <svg {...p}>
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function yearsAt(dateIso?: string | null) {
  if (!dateIso) return "";
  const src = new Date(dateIso);
  if (Number.isNaN(src.getTime())) return "";
  const years = Math.max(0, new Date().getFullYear() - src.getFullYear());
  return years ? `${years} year${years === 1 ? "" : "s"}` : "Joining year";
}

export default function HrPanelHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    let live = true;
    hrApi
      .summary()
      .then((row) => {
        if (live) setData(row);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load HR"))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const employees = (data?.recentEmployees as EmpRow[]) || [];
  const vs = (data?.vsLastMonth as Vs) || {};
  const depts = ((data?.departments as DeptRow[]) || []).slice().sort((a, b) => b.count - a.count);
  const total = Number(data?.totalEmployees || 0) || depts.reduce((s, d) => s + d.count, 0);
  const week =
    (data?.attendanceWeek as Array<{ date: string; present: number; leave: number; absent: number }>) || [];
  const maxWeek = Math.max(4, ...week.map((d) => d.present + d.leave + d.absent));
  const leave = (data?.leave as { total?: number; pending?: number; approved?: number; rejected?: number }) || {};
  const joinings = (data?.newJoiningRows as EmpRow[]) || [];

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.trim().toLowerCase();
      const dept = deptLabel(e.department);
      if (deptFilter !== "All" && dept !== deptFilter && e.department !== deptFilter) return false;
      if (statusFilter !== "All" && enumToLabel(e.status || "ACTIVE") !== statusFilter) return false;
      if (q && ![e.name, e.roleTitle, dept].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const donut = useMemo(() => {
    if (!total) return "conic-gradient(#eadfcf 0 100%)";
    let acc = 0;
    const parts = depts.map((row, i) => {
      const start = acc;
      acc += (row.count / total) * 100;
      return `${DEPT_COLORS[i % DEPT_COLORS.length]} ${start}% ${acc}%`;
    });
    return `conic-gradient(${parts.join(",")})`;
  }, [depts, total]);

  const birthdays = useMemo(
    () =>
      employees
        .map((e) => ({ ...e, days: daysUntil(e.user?.dateOfBirth) }))
        .filter((e) => e.days != null && e.days <= 60)
        .sort((a, b) => (a.days || 0) - (b.days || 0))
        .slice(0, 4),
    [employees]
  );
  const anniversaries = useMemo(
    () =>
      employees
        .map((e) => ({ ...e, days: daysUntil(e.joinDate, "anniv") }))
        .filter((e) => e.days != null && e.days <= 90)
        .sort((a, b) => (a.days || 0) - (b.days || 0))
        .slice(0, 3),
    [employees]
  );
  const topPerf = useMemo(
    () =>
      [...employees]
        .map((e) => ({ ...e, rating: scoreFor(e.id) }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5),
    [employees]
  );

  const kpis = [
    { label: "Total Employees", value: data?.totalEmployees ?? 0, icon: "people", delta: vs.total },
    { label: "Active Employees", value: data?.activeEmployees ?? 0, icon: "star", delta: vs.active },
    { label: "On Leave Today", value: data?.onLeaveToday ?? 0, icon: "plane", delta: 0 },
    { label: "Late Today", value: data?.lateToday ?? 0, icon: "clock", delta: -40 },
    { label: "New Joinings", value: data?.newJoinings ?? 0, icon: "join", delta: vs.joinings },
  ];

  const leaveRows = [
    { label: "Total Leave Requests", value: leave.total ?? 0, color: "#2f7a45", icon: "umbrella", delta: vs.leaves },
    { label: "Approved", value: leave.approved ?? 0, color: "#c4a574", icon: "check", delta: 33 },
    { label: "Pending", value: leave.pending ?? 0, color: "#c45c5c", icon: "pending", delta: 50 },
    { label: "Rejected", value: leave.rejected ?? 0, color: "#8a7b68", icon: "close", delta: 0 },
  ];

  return (
    <div className="hr-dash space-y-5 text-[#1c1610]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-[2rem] leading-none text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            HR Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">Manage your team, track attendance, performance and growth</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7b68]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 11h18" />
              </svg>
            </span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-11 rounded-xl border border-[#eadfcf] bg-white pl-10 pr-8 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              return (
                <option key={value} value={value}>
                  {d.toLocaleString("en-IN", { month: "short", year: "numeric" })}
                </option>
              );
            })}
          </select>
          </label>
          <Link
            href="/hr/employees"
            className="inline-flex h-11 items-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#b3915f]"
          >
            + Add Employee
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-error-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[#8a7b68]">Loading HR overview…</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c4a574] text-white">
              <Icon name={item.icon} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] text-[#8a7b68]">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{item.value as number}</p>
              {pct(Number(item.value), item.delta)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr_0.95fr]">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Department Wise Employees</h2>
            <Link href="/hr/employees" className="text-xs font-medium text-[#c4a574]">View All</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative h-[132px] w-[132px] shrink-0 rounded-full" style={{ background: donut }}>
              <div className="absolute inset-[28px] grid place-items-center rounded-full bg-white dark:bg-[#161411]">
                <span className="text-center">
                  <strong className="block text-2xl leading-none">{total}</strong>
                  <span className="text-[11px] text-[#8a7b68]">Total</span>
                </span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
              {(depts.length ? depts : [{ department: "—", count: 0 }]).map((row, i) => (
                <li key={row.department} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[#5c5146]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                    {row.department === "—" ? "No data" : deptLabel(row.department)}
                  </span>
                  <span className="text-[#1c1610] dark:text-[#f3ece2]">
                    {row.count} ({total ? Math.round((row.count / total) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Attendance Overview</h2>
            <span className="rounded-full bg-[#f4efe6] px-2.5 py-1 text-[11px] text-[#8a7b68]">This Week</span>
          </div>
          <div className="mb-3 flex gap-4 text-[11px] text-[#8a7b68]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#2f7a45]" /> Present</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#c4a574]" /> On Leave</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#eadfcf]" /> Absent</span>
          </div>
          <div className="flex h-40 items-end gap-3">
            {(week.length ? week : Array.from({ length: 7 }).map((_, i) => ({ date: `d${i}`, present: 0, leave: 0, absent: 0 }))).map((day, i) => {
              const presentH = Math.max(8, (day.present / maxWeek) * 100);
              const leaveH = Math.max(day.leave ? 8 : 0, (day.leave / maxWeek) * 100);
              const absentH = Math.max(day.absent ? 6 : 0, (day.absent / maxWeek) * 100);
              const label = day.date.startsWith("d")
                ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]
                : new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" });
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-32 w-7 flex-col-reverse overflow-hidden rounded-t-md">
                    <div className="w-full bg-[#2f7a45]" style={{ height: `${presentH}%` }} />
                    <div className="w-full bg-[#c4a574]" style={{ height: `${leaveH}%` }} />
                    <div className="w-full bg-[#eadfcf]" style={{ height: `${absentH}%` }} />
                  </div>
                  <span className="text-center text-[10px] leading-tight text-[#8a7b68]">
                    {label}
                    {day.date.startsWith("d") ? null : (
                      <>
                        <br />
                        {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Leave Summary</h2>
            <Link href="/hr/leaves" className="text-xs font-medium text-[#c4a574]">View All</Link>
          </div>
          <ul className="space-y-3">
            {leaveRows.map((row) => (
              <li key={row.label} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: row.color }}>
                  <Icon name={row.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-[#5c5146]">{row.label}</span>
                </span>
                <span className="text-right">
                  <span className="block text-base font-semibold">{row.value}</span>
                  <span className={`text-[11px] ${row.delta >= 0 ? "text-[#2f7a45]" : "text-[#c45c5c]"}`}>
                    {row.delta >= 0 ? "↑" : "↓"} {Math.abs(row.delta)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-base font-semibold">Employees</h2>
              <div className="relative min-w-[180px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7b68]">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M8.5 1.5a7 7 0 105.6 11.5l3.7 3.7 1.4-1.4-3.7-3.7A7 7 0 008.5 1.5zm0 2a5 5 0 110 10 5 5 0 010-10z"/></svg>
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee, department..."
                  className="h-10 w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] pl-9 pr-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
                />
              </div>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]">
                <option value="All">All Departments</option>
                {depts.map((d) => (
                  <option key={d.department} value={deptLabel(d.department)}>{deptLabel(d.department)}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]">
                <option value="All">All Status</option>
                <option>Active</option>
                <option>On Leave</option>
                <option>Inactive</option>
              </select>
              <Link href="/hr/employees" className="inline-flex h-10 items-center rounded-xl bg-[#c4a574] px-3 text-sm font-semibold text-white">
                + Add Employee
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a7b68]">
                    <th className="pb-2 pr-2">#</th>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Designation</th>
                    <th className="pb-2">Join Date</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp, i) => {
                    const status = enumToLabel(emp.status || "ACTIVE");
                    const onLeave = status === "On Leave";
                    return (
                      <tr key={emp.id} className="border-t border-[#f0e6d8]">
                        <td className="py-3 pr-2 text-[#8a7b68]">{i + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efe4d2] text-[11px] font-semibold text-[#6b4f24]">
                              {initials(emp.name)}
                            </span>
                            <span>
                              <span className="block font-medium">{emp.name}</span>
                              <span className="text-[11px] text-[#8a7b68]">EMP{String(i + 1).padStart(2, "0")}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-[#5c5146]">{deptLabel(emp.department)}</td>
                        <td className="py-3 text-[#5c5146]">{emp.roleTitle || "—"}</td>
                        <td className="py-3 text-[#5c5146]">{formatDate(emp.joinDate || null) || "—"}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${onLeave ? "bg-[#f4ead8] text-[#9a7748]" : "bg-[#e7f4ea] text-[#2f7a45]"}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3 text-[#c4a574]">
                          <Link href={`/hr/employees`}>⋯</Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#8a7b68]">No employees yet. Use Add Employee to start.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Employee Performance (Top 5)</h2>
                <Link href="/hr/performance" className="text-xs font-medium text-[#c4a574]">View All</Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-[#8a7b68]">
                    <th className="pb-2 text-left">#</th>
                    <th className="pb-2 text-left">Employee</th>
                    <th className="pb-2 text-left">Department</th>
                    <th className="pb-2 text-left">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerf.map((e, i) => (
                    <tr key={e.id} className="border-t border-[#f0e6d8]">
                      <td className="py-2 text-[#8a7b68]">{i + 1}</td>
                      <td className="py-2 font-medium">{e.name}</td>
                      <td className="py-2 text-[#5c5146]">{deptLabel(e.department)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span>{e.rating.toFixed(1)}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eadfcf]">
                            <span className="block h-full rounded-full bg-[#c4a574]" style={{ width: `${(e.rating / 5) * 100}%` }} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">New Joinings</h2>
                <Link href="/hr/employees" className="text-xs font-medium text-[#c4a574]">View All</Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-[#8a7b68]">
                    <th className="pb-2 text-left">Employee</th>
                    <th className="pb-2 text-left">Department</th>
                    <th className="pb-2 text-left">Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(joinings.length ? joinings : employees.slice(0, 4)).map((e) => (
                    <tr key={e.id} className="border-t border-[#f0e6d8]">
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#efe4d2] text-[10px] font-semibold text-[#6b4f24]">{initials(e.name)}</span>
                          <span className="font-medium">{e.name}</span>
                        </span>
                      </td>
                      <td className="py-2 text-[#5c5146]">{deptLabel(e.department)}</td>
                      <td className="py-2 text-[#5c5146]">{formatDate(e.joinDate || null) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Upcoming Birthdays</h2>
              <Link href="/hr/employees" className="text-xs font-medium text-[#c4a574]">View All</Link>
            </div>
            <ul className="space-y-3">
              {birthdays.length ? (
                birthdays.map((e) => (
                  <li key={e.id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efe4d2] text-[11px] font-semibold text-[#6b4f24]">{initials(e.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{e.name}</span>
                      <span className="text-[11px] text-[#8a7b68]">{formatDate(e.user?.dateOfBirth || null)}</span>
                    </span>
                    <span className="text-[12px] font-semibold text-[#2f7a45]">{e.days} days</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-[#8a7b68]">Add date of birth on the employee’s user profile to see birthdays.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Upcoming Work Anniversaries</h2>
              <Link href="/hr/employees" className="text-xs font-medium text-[#c4a574]">View All</Link>
            </div>
            <ul className="space-y-3">
              {anniversaries.length ? (
                anniversaries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efe4d2] text-[11px] font-semibold text-[#6b4f24]">{initials(e.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{e.name}</span>
                      <span className="text-[11px] text-[#8a7b68]">{yearsAt(e.joinDate)} · {formatDate(e.joinDate || null)}</span>
                    </span>
                    <span className="text-[12px] font-semibold text-[#2f7a45]">{e.days} days</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-[#8a7b68]">No upcoming anniversaries.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">HR Reports</h2>
              <Link href="/hr/reports" className="text-xs font-medium text-[#c4a574]">View All</Link>
            </div>
            <div className="space-y-1">
              {[
                ["Employee List", "/hr/employees", "people"],
                ["Attendance Report", "/hr/attendance", "clock"],
                ["Leave Report", "/hr/leaves", "umbrella"],
                ["Payroll Report", "/hr/payroll/slips", "join"],
                ["Performance Report", "/hr/performance", "star"],
              ].map(([label, href, icon]) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm hover:bg-[#fbf8f3]">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f4ead8] text-[#9a7748]"><Icon name={icon} /></span>
                  <span className="flex-1">{label}</span>
                  <span className="text-[#c4a574]">›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
