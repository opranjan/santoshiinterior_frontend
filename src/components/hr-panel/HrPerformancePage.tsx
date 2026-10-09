"use client";

import React, { useEffect, useMemo, useState } from "react";
import { hrApi } from "@/services/crmApi";
import { deptLabel, empCode, initials } from "./hrDisplay";
import HrPageHeader from "./HrPageHeader";

type GoalRow = {
  id: string;
  title: string;
  target: number;
  achieved: number;
  progress: number;
  status: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
};
type EmpRow = {
  id: string;
  name: string;
  employeeCode?: string | null;
  department?: string;
  rating: number;
  goals: number;
  trackStatus: string;
  nextAppraisal?: string | null;
  goalRows: GoalRow[];
};
type Overview = {
  kpis?: {
    total?: number;
    highPerformers?: number;
    onTrackGoals?: number;
    appraisalsPending?: number;
    vsLastMonth?: { total?: number; high?: number; goals?: number; appraisals?: number };
  };
  buckets?: { excellent?: number; good?: number; average?: number; needs?: number };
  departments?: Array<{ department: string; avg: number }>;
  employees?: EmpRow[];
  topPerformers?: EmpRow[];
  upcomingAppraisals?: Array<{ id: string; name: string; department: string; date: string }>;
  summary?: {
    goalsAchieved?: number;
    goalsTotal?: number;
    avgRating?: number;
    highPerformers?: number;
    onTrack?: number;
    needsSupport?: number;
  };
};

const BUCKETS = [
  { key: "excellent", label: "Excellent", color: "#2f7a45" },
  { key: "good", label: "Good", color: "#c4a574" },
  { key: "average", label: "Average", color: "#ead9b8" },
  { key: "needs", label: "Needs Improvement", color: "#c45c5c" },
] as const;

function pctDelta(value?: number) {
  const n = Number(value || 0);
  const up = n >= 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-[#2f7a45]" : "text-[#c45c5c]"}`}>
      {up ? "↑" : "↓"} {Math.abs(n)}% <span className="font-normal text-[#9a8f80]">vs last month</span>
    </span>
  );
}

function trackBadge(status: string) {
  const on = status === "ON_TRACK";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${on ? "bg-[#e7f6ec] text-[#2f7a45]" : "bg-[#f4ead8] text-[#9a7748]"}`}>
      {on ? "On Track" : status === "NEEDS_SUPPORT" ? "Needs Support" : "In Progress"}
    </span>
  );
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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
  if (name === "star")
    return (
      <svg {...p} fill="currentColor" stroke="none">
        <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 16.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z" />
      </svg>
    );
  if (name === "target")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
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

export default function HrPerformancePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [goalOpen, setGoalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goalForm, setGoalForm] = useState({ employeeId: "", title: "", target: "10", achieved: "0" });

  const load = async () => {
    const row = await hrApi.performance();
    setData(row as Overview);
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load performance"));
  }, []);

  const employees = data?.employees || [];
  const depts = useMemo(() => Array.from(new Set(employees.map((e) => deptLabel(e.department)))), [employees]);
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.trim().toLowerCase();
      if (deptFilter !== "All" && deptLabel(e.department) !== deptFilter) return false;
      if (statusFilter === "On Track" && e.trackStatus !== "ON_TRACK") return false;
      if (statusFilter === "In Progress" && e.trackStatus !== "IN_PROGRESS") return false;
      if (q && ![e.name, deptLabel(e.department)].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const total = Number(data?.kpis?.total || employees.length);
  const buckets = BUCKETS.map((b) => ({
    ...b,
    count: Number((data?.buckets as Record<string, number> | undefined)?.[b.key] || 0),
  }));
  const donut = useMemo(() => {
    if (!total) return "conic-gradient(#eadfcf 0 100%)";
    let acc = 0;
    const parts = buckets.map((b) => {
      const start = acc;
      acc += (b.count / total) * 100;
      return `${b.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${parts.join(",")})`;
  }, [buckets, total]);

  const deptBars = data?.departments || [];
  const allGoals = useMemo(
    () =>
      employees.flatMap((e) =>
        (e.goalRows || []).map((g) => ({ ...g, employeeId: e.id, employeeName: e.name, department: e.department }))
      ),
    [employees]
  );

  const addGoal = async () => {
    if (!goalForm.employeeId || !goalForm.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await hrApi.createGoal({
        employeeId: goalForm.employeeId,
        title: goalForm.title.trim(),
        target: Number(goalForm.target || 1),
        achieved: Number(goalForm.achieved || 0),
      });
      setGoalOpen(false);
      setGoalForm({ employeeId: employees[0]?.id || "", title: "", target: "10", achieved: "0" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save goal");
    } finally {
      setSaving(false);
    }
  };

  const medals = ["#c4a574", "#b8b8b8", "#c47a2b"];

  return (
    <div className="space-y-5 text-[#1c1610]">
      <HrPageHeader
        crumb="HR › Performance"
        title="HR Performance"
        subtitle="Track employee performance, goals, and appraisals."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
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
            <button
              type="button"
              onClick={() => {
                setGoalForm((f) => ({ ...f, employeeId: f.employeeId || employees[0]?.id || "" }));
                setGoalOpen(true);
              }}
              className="inline-flex h-11 items-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white hover:bg-[#b3915f]"
            >
              + Set New Goal
            </button>
          </div>
        }
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {goalOpen ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="grid gap-2 md:grid-cols-5">
            <select value={goalForm.employeeId} onChange={(e) => setGoalForm((f) => ({ ...f, employeeId: e.target.value }))} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm">
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <input value={goalForm.title} onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))} placeholder="Goal title" className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm md:col-span-2" />
            <input type="number" min={1} value={goalForm.target} onChange={(e) => setGoalForm((f) => ({ ...f, target: e.target.value }))} placeholder="Target" className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <div className="flex gap-2">
              <button type="button" disabled={saving} onClick={() => void addGoal()} className="h-11 flex-1 rounded-xl bg-[#1c1610] text-sm font-semibold text-[#e8d5b5]">{saving ? "Saving…" : "Save goal"}</button>
              <button type="button" onClick={() => setGoalOpen(false)} className="h-11 rounded-xl border border-[#eadfcf] px-3 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Employees", data?.kpis?.total ?? 0, "people", data?.kpis?.vsLastMonth?.total],
          ["High Performers", data?.kpis?.highPerformers ?? 0, "star", data?.kpis?.vsLastMonth?.high],
          ["On Track Goals", data?.kpis?.onTrackGoals ?? 0, "target", data?.kpis?.vsLastMonth?.goals],
          ["Appraisals Pending", data?.kpis?.appraisalsPending ?? 0, "join", data?.kpis?.vsLastMonth?.appraisals],
        ].map(([label, value, icon, delta]) => (
          <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411]">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c4a574] text-white">
              <Icon name={String(icon)} />
            </span>
            <div>
              <p className="text-[12px] text-[#8a7b68]">{label}</p>
              <p className="text-2xl font-semibold">{value as number}</p>
              {pctDelta(delta as number)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.15fr_0.9fr]">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <h2 className="text-base font-semibold">Performance Rating Distribution</h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-[132px] w-[132px] shrink-0 rounded-full" style={{ background: donut }}>
              <div className="absolute inset-[28px] grid place-items-center rounded-full bg-white dark:bg-[#161411]">
                <strong className="block text-2xl leading-none">{total}</strong>
                <span className="text-[11px] text-[#8a7b68]">Total</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-[13px]">
              {buckets.map((b) => (
                <li key={b.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[#5c5146]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                    {b.label} ({b.count})
                  </span>
                  <span>{total ? Math.round((b.count / total) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <h2 className="text-base font-semibold">Department Performance</h2>
          <div className="mt-6 flex h-40 items-end gap-4">
            {(deptBars.length ? deptBars : [{ department: "—", avg: 0 }]).map((d) => (
              <div key={d.department} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] font-semibold text-[#6b4f24]">{d.avg}%</span>
                <div className="w-10 rounded-t-md bg-[#c4a574]" style={{ height: `${Math.max(8, d.avg)}%` }} />
                <span className="text-center text-[10px] text-[#8a7b68]">{deptLabel(d.department).split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Top Performers</h2>
            <span className="text-xs font-medium text-[#c4a574]">View All</span>
          </div>
          <ul className="space-y-3">
            {(data?.topPerformers || []).slice(0, 3).map((e, i) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: medals[i] || "#c4a574" }}>{i + 1}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efe4d2] text-[11px] font-semibold text-[#6b4f24]">{initials(e.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{e.name}</span>
                  <span className="text-[11px] text-[#8a7b68]">{deptLabel(e.department)}</span>
                </span>
                <span className="text-sm font-semibold text-[#2f7a45]">{e.rating}%</span>
              </li>
            ))}
            {!data?.topPerformers?.length ? <li className="text-sm text-[#8a7b68]">Add employees to rank performers.</li> : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-base font-semibold">Employee Performance</h2>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, department..." className="h-10 min-w-[180px] flex-1 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
                <option value="All">All Departments</option>
                {depts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
                <option value="All">All Status</option>
                <option>On Track</option>
                <option>In Progress</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-[#8a7b68]">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Goals</th>
                    <th className="pb-2">Rating</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id} className="border-t border-[#f0e6d8]">
                      <td className="py-3 text-[#8a7b68]">{i + 1}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efe4d2] text-[11px] font-semibold text-[#6b4f24]">{initials(e.name)}</span>
                          <span>
                            <span className="block font-medium">{e.name}</span>
                            <span className="text-[11px] text-[#8a7b68]">{e.employeeCode || empCode(e.id, i)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-3">{deptLabel(e.department)}</td>
                      <td className="py-3">{e.goals}</td>
                      <td className="py-3 font-semibold text-[#2f7a45]">{e.rating}%</td>
                      <td className="py-3">{trackBadge(e.trackStatus)}</td>
                    </tr>
                  ))}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#8a7b68]">No employees yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Goals & Targets</h2>
              <button type="button" onClick={() => setGoalOpen(true)} className="text-xs font-medium text-[#c4a574]">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-[#8a7b68]">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Goal</th>
                    <th className="pb-2">Target</th>
                    <th className="pb-2">Achieved</th>
                    <th className="pb-2">Progress</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allGoals.slice(0, 8).map((g, i) => (
                    <tr key={g.id} className="border-t border-[#f0e6d8]">
                      <td className="py-3 text-[#8a7b68]">{i + 1}</td>
                      <td className="py-3 font-medium">{g.employeeName}</td>
                      <td className="py-3">{g.title}</td>
                      <td className="py-3">{g.target}</td>
                      <td className="py-3">{g.achieved}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[#eadfcf]">
                            <span className="block h-full rounded-full bg-[#c4a574]" style={{ width: `${g.progress}%` }} />
                          </span>
                          <span>{g.progress}%</span>
                        </span>
                      </td>
                      <td className="py-3">{trackBadge(g.status)}</td>
                    </tr>
                  ))}
                  {!allGoals.length ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#8a7b68]">No goals yet. Use Set New Goal.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Upcoming Appraisals</h2>
            </div>
            <ul className="space-y-3">
              {(data?.upcomingAppraisals || []).map((row) => (
                <li key={row.id} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4ead8] text-[#9a7748]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{row.name}</span>
                    <span className="text-[11px] text-[#8a7b68]">{deptLabel(row.department)}</span>
                  </span>
                  <span className="text-[12px] text-[#8a7b68]">{fmtDate(row.date)}</span>
                </li>
              ))}
              {!data?.upcomingAppraisals?.length ? <li className="text-sm text-[#8a7b68]">Set join dates to schedule appraisals.</li> : null}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <h2 className="mb-3 text-base font-semibold">Performance Summary</h2>
            <ul className="space-y-3 text-sm">
              {[
                ["Goals Achieved", `${data?.summary?.goalsAchieved ?? 0} / ${data?.summary?.goalsTotal ?? 0}`, `${data?.summary?.goalsTotal ? Math.round(((data.summary.goalsAchieved || 0) / data.summary.goalsTotal) * 100) : 0}%`],
                ["Average Rating", `${data?.summary?.avgRating ?? 0}%`, ""],
                ["High Performers", String(data?.summary?.highPerformers ?? 0), ""],
                ["Employees On Track", String(data?.summary?.onTrack ?? 0), ""],
                ["Employees Needing Support", String(data?.summary?.needsSupport ?? 0), ""],
              ].map(([label, value, extra]) => (
                <li key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[#5c5146]">{label}</span>
                  <span className="font-semibold">
                    {value} {extra ? <span className="text-[#2f7a45]">{extra}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
