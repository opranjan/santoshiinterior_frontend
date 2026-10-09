"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hrApi } from "@/services/crmApi";
import { mapEmployee } from "@/lib/crmMappers";
import HrPageHeader from "./HrPageHeader";
import { deptLabel, initials } from "./hrDisplay";

type Emp = ReturnType<typeof mapEmployee>;

export default function HrEmployeesPage() {
  const [items, setItems] = useState<Emp[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "SALES",
    roleTitle: "",
    joinDate: "",
  });

  const load = async () => {
    const data = await hrApi.listEmployees({ limit: 200 });
    setItems((data.items || []).map((row) => mapEmployee(row)));
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) =>
      [e.name, e.email, e.department, e.role, e.store].join(" ").toLowerCase().includes(q)
    );
  }, [items, search]);

  const add = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await hrApi.createEmployee({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        department: form.department,
        roleTitle: form.roleTitle.trim() || null,
        joinDate: form.joinDate || null,
        status: "ACTIVE",
      });
      setForm({ name: "", email: "", phone: "", department: "SALES", roleTitle: "", joinDate: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <HrPageHeader
        crumb="HR › Employees"
        title="Employees"
        subtitle="Directory of Santoshi Interiors team members"
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid gap-3 md:grid-cols-6">
          <input className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <select className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
            {["SALES", "DESIGN", "SITE", "ACCOUNTS", "HR", "ADMIN"].map((d) => (
              <option key={d} value={d}>{deptLabel(d)}</option>
            ))}
          </select>
          <input className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]" placeholder="Designation" value={form.roleTitle} onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))} />
          <button type="button" disabled={saving || !form.name.trim()} onClick={() => void add()} className="h-11 rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50">
            {saving ? "Saving…" : "+ Add"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee, department…"
          className="mb-4 h-11 w-full max-w-sm rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-[#8a7b68]">
              <tr>
                <th className="pb-2">Employee</th>
                <th className="pb-2">Department</th>
                <th className="pb-2">Designation</th>
                <th className="pb-2">Join Date</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => (
                <tr key={emp.id} className="border-t border-[#eadfcf]">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1c1610] text-[10px] text-[#e8d5b5]">{initials(emp.name)}</span>
                      <span>
                        <span className="block font-medium text-[#1c1610] dark:text-[#f3ece2]">{emp.name}</span>
                        <span className="text-xs text-[#8a7b68]">{emp.email || emp.phone}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3">{deptLabel(emp.department)}</td>
                  <td className="py-3">{emp.role || "—"}</td>
                  <td className="py-3">{emp.joinDate || "—"}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-[#e8f3ea] px-2 py-0.5 text-[11px] font-semibold text-[#2f6b3a]">{emp.status}</span>
                  </td>
                  <td className="py-3">
                    <Link href={`/hr/payroll/slips?employee=${emp.id}`} className="text-xs font-semibold uppercase tracking-[0.1em] text-[#c4a574]">
                      Salary slip
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
