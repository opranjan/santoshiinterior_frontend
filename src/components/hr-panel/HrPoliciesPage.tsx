"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { hrApi } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";
import HrPageHeader from "./HrPageHeader";

type Attachment = { id?: string; fileName: string; url?: string; size?: number };
type Policy = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  content?: string | null;
  version?: string;
  status?: string;
  applicableTo?: string;
  effectiveDate?: string | null;
  updatedAt?: string;
  createdAt?: string;
  attachments?: Attachment[];
  ackCount?: number;
};

const FALLBACK_CATS = [
  "General",
  "Leave & Attendance",
  "Workplace Conduct",
  "Compensation & Benefits",
  "Health & Safety",
];

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fileSize(n?: number) {
  const v = Number(n || 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HrPoliciesPage() {
  const [items, setItems] = useState<Policy[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATS);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<"Overview" | "Content" | "Acknowledgement" | "History">("Overview");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "General",
    description: "",
    applicableTo: "All Employees",
    version: "v1.0",
    status: "ACTIVE",
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const data = await hrApi.listPolicies();
    const rows = ((data.items || []) as Policy[]).map((row) => ({
      ...row,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
    }));
    setItems(rows);
    setEmployeeCount(Number(data.employeeCount || 0));
    setCategories(data.categories?.length ? data.categories : FALLBACK_CATS);
    setSelectedId((id) => id || rows[0]?.id || "");
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load policies"));
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: items.length };
    categories.forEach((c) => {
      map[c] = items.filter((p) => p.category === c).length;
    });
    return map;
  }, [items, categories]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (statusFilter === "Active" && p.status !== "ACTIVE") return false;
      if (statusFilter === "Draft" && p.status !== "DRAFT") return false;
      const q = search.trim().toLowerCase();
      if (q && ![p.title, p.category, p.description].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, category, statusFilter, search]);

  const selected = items.find((p) => p.id === selectedId) || filtered[0] || null;
  const activeCount = items.filter((p) => p.status === "ACTIVE").length;
  const ackTotal = items.reduce((s, p) => s + Number(p.ackCount || 0), 0);
  const ackDenom = Math.max(1, employeeCount * Math.max(1, activeCount));
  const ackPct = employeeCount && activeCount ? Math.round((ackTotal / ackDenom) * 100) : 0;
  const selectedAck = Number(selected?.ackCount || 0);
  const selectedPending = Math.max(0, employeeCount - selectedAck);
  const selectedPct = employeeCount ? Math.round((selectedAck / employeeCount) * 100) : 0;

  const saveNew = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = (await hrApi.createPolicy(form)) as Policy;
      setAdding(false);
      setForm({ title: "", category: "General", description: "", applicableTo: "All Employees", version: "v1.0", status: "ACTIVE", effectiveDate: new Date().toISOString().slice(0, 10) });
      await load();
      setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add policy");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await hrApi.updatePolicy(selected.id, {
        title: selected.title,
        category: selected.category,
        description: selected.description,
        content: selected.content || selected.description,
        version: selected.version,
        status: selected.status,
        applicableTo: selected.applicableTo,
        effectiveDate: selected.effectiveDate,
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update policy");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (!selected) return;
    await hrApi.uploadPolicyFile(selected.id, file);
    await load();
  };

  return (
    <div className="space-y-5 text-[#1c1610]">
      <HrPageHeader
        crumb="HR › HR Policies"
        title="HR Policies"
        subtitle="Manage and share company policies, rules and guidelines with your employees."
        actions={
          <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-11 items-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white hover:bg-[#b3915f]">
            + Add Policy
          </button>
        }
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      {adding ? (
        <div className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="grid gap-2 md:grid-cols-4">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Policy name" className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} className="h-11 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Policy description" className="min-h-[88px] rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-2 text-sm md:col-span-3" />
            <button type="button" disabled={saving} onClick={() => void saveNew()} className="h-11 rounded-xl bg-[#1c1610] text-sm font-semibold text-[#e8d5b5]">
              {saving ? "Saving…" : "Save policy"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Policies", items.length, "Total active policies"],
          ["Active Policies", activeCount, "Currently published"],
          ["Policy Categories", categories.length, "Organized by type"],
          ["Employee Acknowledgement", `${ackPct}%`, `${ackTotal} of ${employeeCount} employees`],
        ].map(([label, value, hint]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c4a574] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6" />
              </svg>
            </span>
            <div>
              <p className="text-2xl font-semibold">{value}</p>
              <p className="text-[12px] text-[#8a7b68]">{label}</p>
              <p className="text-[11px] text-[#b3a898]">{hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(320px,0.95fr)]">
        <aside className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <h2 className="mb-3 text-sm font-semibold">Policy Categories</h2>
          <button type="button" onClick={() => setCategory("All")} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${category === "All" ? "bg-[#c4a574] text-white" : "hover:bg-[#fbf8f3]"}`}>
            <span>All Policies</span>
            <span>{counts.All || 0}</span>
          </button>
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${category === c ? "bg-[#c4a574] text-white" : "hover:bg-[#fbf8f3]"}`}>
              <span>{c}</span>
              <span>{counts[c] || 0}</span>
            </button>
          ))}
        </aside>

        <section className="rounded-2xl border border-[#eadfcf] bg-white p-4 dark:border-[#3a342c] dark:bg-[#161411]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-sm font-semibold">All Policies ({filtered.length})</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policies..." className="h-9 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-xl border border-[#eadfcf] bg-white px-2 text-sm">
              <option>Active</option>
              <option>Draft</option>
              <option>All</option>
            </select>
          </div>
          <ul className="space-y-1">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setEditing(false);
                    setTab("Overview");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${selected?.id === p.id ? "bg-[#f4ead8]" : "hover:bg-[#fbf8f3]"}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#efe4d2] text-[#9a7748]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{p.title}</span>
                    <span className="text-[11px] text-[#8a7b68]">{p.category}</span>
                  </span>
                  <span className="text-[11px] text-[#8a7b68]">{fmt(p.effectiveDate)}</span>
                  <span className="rounded-full bg-[#e7f6ec] px-2 py-0.5 text-[11px] font-semibold text-[#2f7a45]">{p.status === "ACTIVE" ? "Active" : "Draft"}</span>
                </button>
              </li>
            ))}
            {!filtered.length ? <li className="px-3 py-8 text-center text-sm text-[#8a7b68]">No policies yet. Use Add Policy.</li> : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#eadfcf] bg-white p-5 dark:border-[#3a342c] dark:bg-[#161411]">
          {!selected ? (
            <p className="text-sm text-[#8a7b68]">Select a policy to view details.</p>
          ) : (
            <>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{selected.title}</h2>
                  <span className="rounded-full bg-[#e7f6ec] px-2 py-0.5 text-[11px] font-semibold text-[#2f7a45]">{selected.status === "ACTIVE" ? "Active" : "Draft"}</span>
                </div>
              </div>
              <div className="mb-4 flex gap-4 border-b border-[#eadfcf] text-sm">
                {(["Overview", "Content", "Acknowledgement", "History"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={`pb-2 ${tab === t ? "border-b-2 border-[#c4a574] font-semibold text-[#9a7748]" : "text-[#8a7b68]"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {tab === "Overview" || tab === "Content" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Basic Information</h3>
                    <button type="button" onClick={() => (editing ? void saveEdit() : setEditing(true))} className="text-xs font-semibold text-[#c4a574]">
                      {editing ? (saving ? "Saving…" : "Save") : "Edit"}
                    </button>
                  </div>
                  <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                    {[
                      ["Policy Name", "title"],
                      ["Category", "category"],
                      ["Effective Date", "effectiveDate"],
                      ["Last Updated", "updatedAt"],
                      ["Applicable To", "applicableTo"],
                      ["Version", "version"],
                    ].map(([label, key]) => (
                      <React.Fragment key={key}>
                        <dt className="text-[#8a7b68]">{label}</dt>
                        <dd>
                          {editing && key !== "updatedAt" ? (
                            key === "category" ? (
                              <select value={selected.category} onChange={(e) => setItems((rows) => rows.map((r) => (r.id === selected.id ? { ...r, category: e.target.value } : r)))} className="h-9 w-full rounded-lg border border-[#eadfcf] px-2">
                                {categories.map((c) => (
                                  <option key={c}>{c}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={key === "effectiveDate" ? "date" : "text"}
                                value={key === "effectiveDate" ? String(selected.effectiveDate || "").slice(0, 10) : String((selected as Record<string, unknown>)[key] || "")}
                                onChange={(e) => setItems((rows) => rows.map((r) => (r.id === selected.id ? { ...r, [key]: e.target.value } : r)))}
                                className="h-9 w-full rounded-lg border border-[#eadfcf] px-2"
                              />
                            )
                          ) : key === "effectiveDate" || key === "updatedAt" ? (
                            fmt(String((selected as Record<string, unknown>)[key] || ""))
                          ) : (
                            String((selected as Record<string, unknown>)[key] || "—")
                          )}
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Policy Description</h3>
                    {editing ? (
                      <textarea
                        value={selected.description || ""}
                        onChange={(e) => setItems((rows) => rows.map((r) => (r.id === selected.id ? { ...r, description: e.target.value, content: e.target.value } : r)))}
                        className="min-h-[100px] w-full rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-2 text-sm"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed text-[#5c5146]">{selected.description || selected.content || "No description yet."}</p>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Attachments</h3>
                      <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-[#c4a574]">
                        + Add File
                      </button>
                      <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                        e.target.value = "";
                      }} />
                    </div>
                    <ul className="space-y-2">
                      {(selected.attachments || []).map((file) => (
                        <li key={file.id || file.fileName} className="flex items-center justify-between rounded-xl border border-[#eadfcf] px-3 py-2 text-sm">
                          <span className="min-w-0 truncate">{file.fileName}</span>
                          <span className="flex items-center gap-3 text-[#8a7b68]">
                            {fileSize(file.size)}
                            {file.url ? (
                              <a href={designAssetUrl(file.url)} target="_blank" rel="noreferrer" className="font-semibold text-[#c4a574]">↓</a>
                            ) : null}
                          </span>
                        </li>
                      ))}
                      {!(selected.attachments || []).length ? <li className="text-sm text-[#8a7b68]">No files attached.</li> : null}
                    </ul>
                  </div>
                </div>
              ) : null}

              {tab === "Acknowledgement" ? (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Acknowledgement Status</h3>
                  <div className="flex items-center gap-5">
                    <div className="relative grid h-24 w-24 place-items-center rounded-full" style={{ background: `conic-gradient(#2f7a45 ${selectedPct}% , #eadfcf 0)` }}>
                      <div className="absolute inset-[10px] grid place-items-center rounded-full bg-white text-center">
                        <strong className="text-lg leading-none">{selectedPct}%</strong>
                      </div>
                    </div>
                    <ul className="text-sm">
                      <li className="flex justify-between gap-8"><span className="text-[#2f7a45]">Acknowledged</span><span>{selectedAck}</span></li>
                      <li className="flex justify-between gap-8"><span className="text-[#c45c5c]">Pending</span><span>{selectedPending}</span></li>
                      <li className="mt-2 text-[11px] text-[#8a7b68]">{employeeCount} employees in directory</li>
                    </ul>
                  </div>
                </div>
              ) : null}

              {tab === "History" ? (
                <ul className="space-y-3 text-sm">
                  <li>
                    <p className="font-medium">Created</p>
                    <p className="text-[#8a7b68]">{fmt(selected.createdAt)}</p>
                  </li>
                  <li>
                    <p className="font-medium">Last updated</p>
                    <p className="text-[#8a7b68]">{fmt(selected.updatedAt)} · {selected.version}</p>
                  </li>
                </ul>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
