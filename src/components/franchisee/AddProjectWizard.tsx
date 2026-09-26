"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import { customersApi, projectsApi, type CustomerDto } from "@/services/crmApi";
import { useAuth } from "@/context/AuthContext";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const STEPS = [
  { n: 1, title: "Project Details", hint: "Step 1" },
  { n: 2, title: "Project Info", hint: "Step 2" },
  { n: 3, title: "Documents & Media", hint: "Step 3" },
  { n: 4, title: "Review & Submit", hint: "Step 4" },
];

const PROJECT_TYPES = [
  "Residential",
  "Commercial",
  "Office",
  "Retail Showroom",
  "Renovation",
  "Modular Kitchen",
  "Wood Work / Carpentry",
];

function customerCode(id: string) {
  const digits = id.replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `CUST-${digits}`;
}

export default function AddProjectWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [openPicker, setOpenPicker] = useState(false);
  const [selected, setSelected] = useState<CustomerDto | null>(null);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [elevations, setElevations] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [extraDocs, setExtraDocs] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void customersApi
        .list({ search: query || undefined, limit: 20 })
        .then((res) => setCustomers(res.items || []))
        .catch(() => setCustomers([]));
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const canNext = useMemo(() => {
    if (step === 1) return Boolean(selected && name.trim() && projectType && location.trim());
    return true;
  }, [step, selected, name, projectType, location]);

  const pickElevation = (list: FileList | null) => {
    if (!list) return;
    setElevations((prev) => [...prev, ...Array.from(list)].slice(0, 8));
  };

  const submit = async () => {
    if (!selected || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = (await projectsApi.create({
        name: name.trim(),
        customerId: selected.id,
        clientName: selected.name,
        phone: selected.phone,
        projectType,
        address: location.trim(),
        budget: budget.trim() || null,
        scope: scope.trim() || null,
        description: description.trim() || null,
        storeId: user?.storeId || selected.storeId || null,
      })) as { id: string };

      for (const file of elevations) {
        await projectsApi.uploadFile(created.id, file, "elevation");
      }
      if (video) await projectsApi.uploadFile(created.id, video, "video");
      for (const file of extraDocs) {
        await projectsApi.uploadFile(created.id, file, "document");
      }
      router.replace("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/projects" className="hover:text-gray-700 dark:hover:text-gray-200">
          Projects
        </Link>
        <span className="mx-1">›</span>
        <span className="text-gray-800 dark:text-white/90">Add New Project</span>
      </p>
      <div className="mt-2 mb-5 flex items-center gap-3">
        <Link
          href="/projects"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          ←
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Add New Project</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-6 border-b border-gray-200 pb-4 dark:border-gray-800">
        {STEPS.map((row) => {
          const active = step === row.n;
          const done = step > row.n;
          return (
            <div key={row.n} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  active || done
                    ? "bg-brand-500 text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {row.n}
              </span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    active ? "text-gray-800 dark:text-white/90" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {row.title}
                </p>
                <p className="text-[11px] text-gray-400">{row.hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          {error ? (
            <p className="mb-4 rounded-xl bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </p>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Step 1: Project Details
              </h2>
              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Customer *
                </label>
                <input
                  value={selected ? `${selected.name} · ${selected.phone}` : query}
                  onChange={(e) => {
                    setSelected(null);
                    setQuery(e.target.value);
                    setOpenPicker(true);
                  }}
                  onFocus={() => setOpenPicker(true)}
                  placeholder="Search by name, ID or mobile number..."
                  className={fieldClass}
                />
                {openPicker ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {customers.length ? (
                      customers.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          onClick={() => {
                            setSelected(row);
                            setQuery("");
                            setOpenPicker(false);
                            if (!location && row.address) setLocation(row.address);
                          }}
                        >
                          <span>
                            <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
                            <span className="ml-2 text-gray-500">+91 {row.phone}</span>
                          </span>
                          <span className="text-[11px] text-gray-400">{customerCode(row.id)}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-400">No customers found</p>
                    )}
                  </div>
                ) : null}
              </div>

              {selected ? (
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-white">
                      {selected.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white/90">
                        {selected.name}{" "}
                        <span className="ml-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                          {selected.status === "ACTIVE" ? "Active" : selected.status}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {customerCode(selected.id)} · +91 {selected.phone}
                        {selected.email ? ` · ${selected.email}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-brand-500">✓</span>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Customer ID *
                </label>
                <input
                  readOnly
                  value={selected ? customerCode(selected.id) : ""}
                  placeholder="Select a customer"
                  className={`${fieldClass} bg-gray-50 dark:bg-gray-900`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Name *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Type *
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select project type</option>
                    {PROJECT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Project Location *</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter project location"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <section className="border-t border-slate-100 pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Step 2: Paper Elevation</h3>
                    <p className="text-xs text-slate-500">Upload paper elevation / drawings (PDF, JPG, PNG)</p>
                  </div>
                  <label className="cursor-pointer rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                    + Add Elevation
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => pickElevation(e.target.files)}
                    />
                  </label>
                </div>
                {elevations.length ? (
                  <ul className="space-y-1 text-sm text-slate-600">
                    {elevations.map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="font-semibold">Step 3: Race Budget</h3>
                <p className="mb-2 text-xs text-slate-500">Enter race budget for this project</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">₹</span>
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Enter race budget"
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Step 4: Site Video</h3>
                    <p className="text-xs text-slate-500">Upload site video for reference (MP4, MOV, 3GP)</p>
                  </div>
                  <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium">
                    Upload Video
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/3gpp,.mp4,.mov,.3gp"
                      className="hidden"
                      onChange={(e) => setVideo(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                {video ? <p className="text-sm text-slate-600">{video.name}</p> : null}
              </section>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Step 2: Project Info</h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Scope</label>
                <input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="e.g. Full 3 BHK interiors"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Add project notes for the team"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Step 3: Documents & Media</h2>
              <p className="text-sm text-slate-500">Add any extra drawings, quotes, or photos (max 100 MB each).</p>
              <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-sm text-slate-500">
                Click to upload additional files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    setExtraDocs((prev) => [...prev, ...Array.from(e.target.files || [])].slice(0, 10))
                  }
                />
              </label>
              {extraDocs.length ? (
                <ul className="text-sm text-slate-600">
                  {extraDocs.map((file) => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3 text-sm">
              <h2 className="text-lg font-semibold">Step 4: Review & Submit</h2>
              <p>
                <span className="text-slate-500">Customer:</span> {selected?.name} ({selected ? customerCode(selected.id) : "—"})
              </p>
              <p>
                <span className="text-slate-500">Project:</span> {name} · {projectType}
              </p>
              <p>
                <span className="text-slate-500">Location:</span> {location}
              </p>
              <p>
                <span className="text-slate-500">Race budget:</span> {budget ? `₹ ${budget}` : "—"}
              </p>
              <p>
                <span className="text-slate-500">Elevations:</span> {elevations.length} file(s)
              </p>
              <p>
                <span className="text-slate-500">Site video:</span> {video ? video.name : "Not uploaded"}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => (step === 1 ? router.push("/projects") : setStep((n) => n - 1))}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((n) => n + 1)}
                className="rounded-xl bg-[#1d4ed8] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Next ›
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || !canNext}
                onClick={() => void submit()}
                className="rounded-xl bg-[#1d4ed8] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? "Submitting…" : "Submit project"}
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
              <span className="text-blue-500">💡</span> Project Tips
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Please provide accurate information to help us manage your project efficiently.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800">Accepted Formats</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-500">
              <li>Images: JPG, PNG, PDF</li>
              <li>Video: MP4, MOV, 3GP</li>
              <li>Max file size: 100 MB</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
