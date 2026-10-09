"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { hrApi } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";
import { deptLabel, empCode, initials } from "./hrDisplay";
import HrPageHeader from "./HrPageHeader";

type EmpLite = { id: string; name: string; department?: string; employeeCode?: string | null };
type Doc = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  scope: string;
  status: string;
  createdAt: string;
  deletedAt?: string | null;
  employeeId?: string | null;
  employee?: EmpLite | null;
};

type Tab = "All Documents" | "Employee Documents" | "Company Documents" | "Shared With Me" | "Recycle Bin";

const TYPE_STYLE: Record<string, string> = {
  Identity: "bg-[#e8f1fb] text-[#3b6fd4]",
  Employment: "bg-[#e7f6ec] text-[#2f7a45]",
  Finance: "bg-[#f3eaff] text-[#7a4db8]",
  Qualification: "bg-[#fff3e6] text-[#c47a2b]",
  Health: "bg-[#fde8e8] text-[#c45c5c]",
  Other: "bg-[#f0e6d8] text-[#8a7b68]",
};

function prettySize(n: number) {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ago(value?: string) {
  if (!value) return "";
  const mins = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function HrDocumentsPage() {
  const [items, setItems] = useState<Doc[]>([]);
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageCap, setStorageCap] = useState(5 * 1024 * 1024 * 1024);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [vsLastMonth, setVsLastMonth] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("All Documents");
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [type, setType] = useState("All");
  const [empId, setEmpId] = useState("All");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Identity", employeeId: "", scope: "EMPLOYEE" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const load = async (recycle = tab === "Recycle Bin") => {
    const data = await hrApi.listDocuments(recycle ? { deleted: "true" } : undefined);
    setItems((data.items as Doc[]) || []);
    setEmployees((data.employees as EmpLite[]) || []);
    setEmployeeCount(Number(data.employeeCount || 0));
    setStorageUsed(Number(data.storageUsed || 0));
    setStorageCap(Number(data.storageCap || storageCap));
    setByType((data.byType as Record<string, number>) || {});
    setVsLastMonth(Number(data.vsLastMonth || 0));
  };

  useEffect(() => {
    load(tab === "Recycle Bin").catch((err) => setError(err instanceof Error ? err.message : "Failed to load documents"));
  }, [tab]);

  const depts = useMemo(() => Array.from(new Set(employees.map((e) => deptLabel(e.department)))), [employees]);
  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (tab === "Employee Documents" && d.scope !== "EMPLOYEE") return false;
      if (tab === "Company Documents" && d.scope !== "COMPANY") return false;
      if (tab === "Shared With Me" && d.scope !== "EMPLOYEE") return false;
      const q = search.trim().toLowerCase();
      if (q && ![d.name, d.fileName, d.employee?.name, d.type].join(" ").toLowerCase().includes(q)) return false;
      if (type !== "All" && d.type !== type) return false;
      if (empId !== "All" && d.employeeId !== empId) return false;
      if (dept !== "All" && deptLabel(d.employee?.department) !== dept) return false;
      return true;
    });
  }, [items, tab, search, type, empId, dept]);

  const usedPct = storageCap ? Math.round((storageUsed / storageCap) * 100) : 0;
  const catTotal = Object.values(byType).reduce((s, n) => s + n, 0);

  const upload = async () => {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      await hrApi.uploadDocument(
        {
          name: form.name.trim() || file.name,
          type: form.scope === "COMPANY" ? form.type : form.type,
          employeeId: form.scope === "COMPANY" ? undefined : form.employeeId || undefined,
          scope: form.scope,
        },
        file
      );
      setAdding(false);
      setFile(null);
      setForm({ name: "", type: "Identity", employeeId: employees[0]?.id || "", scope: "EMPLOYEE" });
      await load(false);
      setTab("All Documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const verify = async (id: string) => {
    await hrApi.updateDocument(id, { status: "VERIFIED" });
    await load(tab === "Recycle Bin");
  };

  const trash = async (id: string) => {
    await hrApi.removeDocument(id);
    await load(tab === "Recycle Bin");
  };

  const restore = async (id: string) => {
    await hrApi.updateDocument(id, { restore: true });
    await load(true);
  };

  return (
    <div className="space-y-5 text-[#1c1610]">
      <HrPageHeader
        crumb="HR › Documents"
        title="Documents"
        subtitle="Manage, store and share employee documents securely."
        actions={
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({ ...f, employeeId: f.employeeId || employees[0]?.id || "" }));
              setAdding((v) => !v);
            }}
            className="inline-flex h-11 items-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white hover:bg-[#b3915f]"
          >
            + Upload Document
          </button>
        }
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {adding ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="grid gap-2 md:grid-cols-5">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Document name" className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm">
              {["Identity", "Employment", "Finance", "Qualification", "Health", "Other"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm">
              <option value="EMPLOYEE">Employee document</option>
              <option value="COMPANY">Company document</option>
            </select>
            <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} disabled={form.scope === "COMPANY"} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm disabled:opacity-50">
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => fileRef.current?.click()} className="h-11 flex-1 rounded-xl border border-[#eadfcf] text-sm">
                {file ? file.name : "Choose file"}
              </button>
              <button type="button" disabled={saving || !file} onClick={() => void upload()} className="h-11 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5] disabled:opacity-50">
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Documents", String(tab === "Recycle Bin" ? items.length : catTotal), `${vsLastMonth >= 0 ? "↑" : "↓"} ${Math.abs(vsLastMonth)}% vs last month`],
          ["Employees", String(employeeCount), "Directory headcount"],
          ["Storage Used", prettySize(storageUsed), `${usedPct}% of ${prettySize(storageCap)}`],
          ["Secure Storage", "100%", "All documents are encrypted"],
        ].map(([label, value, hint]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c4a574] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
            </span>
            <div>
              <p className="text-[12px] text-[#8a7b68]">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
              <p className="text-[11px] text-[#b3a898]">{hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.85fr)]">
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-[#eadfcf] pb-3">
            {(["All Documents", "Employee Documents", "Company Documents", "Shared With Me", "Recycle Bin"] as Tab[]).map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === item ? "bg-[#c4a574] text-white" : "text-[#5c5146]"}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents, employee name, type..." className="h-10 min-w-[180px] flex-1 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
              <option value="All">All Departments</option>
              {depts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
              <option value="All">All Document Types</option>
              {Object.keys(TYPE_STYLE).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="h-10 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
              <option value="All">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.08em] text-[#8a7b68]">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Document Name</th>
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Upload Date</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id} className="border-t border-[#f0e6d8]">
                    <td className="py-3 text-[#8a7b68]">{i + 1}</td>
                    <td className="py-3 font-medium">
                      <a href={designAssetUrl(d.url)} target="_blank" rel="noreferrer" className="hover:text-[#c4a574]">
                        {d.name}
                      </a>
                      <span className="block text-[11px] font-normal text-[#8a7b68]">{prettySize(d.size)}</span>
                    </td>
                    <td className="py-3">
                      {d.employee ? (
                        <span className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#efe4d2] text-[10px] font-semibold text-[#6b4f24]">{initials(d.employee.name)}</span>
                          <span>
                            <span className="block">{d.employee.name}</span>
                            <span className="text-[11px] text-[#8a7b68]">{d.employee.employeeCode || empCode(d.employee.id, i)}</span>
                          </span>
                        </span>
                      ) : (
                        "Company"
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[d.type] || TYPE_STYLE.Other}`}>{d.type}</span>
                    </td>
                    <td className="py-3">{d.employee ? deptLabel(d.employee.department) : "—"}</td>
                    <td className="py-3">{fmt(d.createdAt)}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.status === "VERIFIED" ? "bg-[#e7f6ec] text-[#2f7a45]" : "bg-[#fff3e6] text-[#c47a2b]"}`}>
                        {d.status === "VERIFIED" ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2 text-xs font-semibold">
                        {tab === "Recycle Bin" ? (
                          <button type="button" onClick={() => void restore(d.id)} className="text-[#2f7a45]">Restore</button>
                        ) : (
                          <>
                            {d.status !== "VERIFIED" ? (
                              <button type="button" onClick={() => void verify(d.id)} className="text-[#2f7a45]">Verify</button>
                            ) : null}
                            <button type="button" onClick={() => void trash(d.id)} className="text-[#c45c5c]">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#8a7b68]">No documents yet. Use Upload Document.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Storage Usage</h2>
              <span className="text-[11px] text-[#8a7b68]">{usedPct}%</span>
            </div>
            <p className="text-sm text-[#8a7b68]">{prettySize(storageUsed)} of {prettySize(storageCap)} used</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eadfcf]">
              <div className="h-full rounded-full bg-[#c4a574]" style={{ width: `${Math.min(100, usedPct)}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <h2 className="mb-3 text-sm font-semibold">Document Categories</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between rounded-lg bg-[#f4ead8] px-3 py-2">
                <span>All Documents</span>
                <span>{catTotal}</span>
              </li>
              {["Identity", "Employment", "Qualification", "Finance", "Health", "Other"].map((key) => (
                <li key={key}>
                  <button type="button" onClick={() => setType(key)} className="flex w-full justify-between rounded-lg px-3 py-2 hover:bg-[#fbf8f3]">
                    <span>{key === "Identity" ? "Identity Proof" : key}</span>
                    <span>{byType[key] || 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <h2 className="mb-3 text-sm font-semibold">Recent Uploads</h2>
            <ul className="space-y-3 text-sm">
              {items.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-[11px] text-[#8a7b68]">Uploaded by {d.employee?.name || "HR"} · {ago(d.createdAt)}</p>
                </li>
              ))}
              {!items.length ? <li className="text-[#8a7b68]">No uploads yet.</li> : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
