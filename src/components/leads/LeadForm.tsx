"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { leadsApi, storesApi } from "@/services/crmApi";
import { ApiError } from "@/lib/api";

const leadSourceOptions = [
  "Walk-in",
  "Referral",
  "Website",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Exhibition",
  "Other",
];

const statusOptions = [
  { value: "CREATED", label: "Created" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "QUOTATION", label: "Quotation Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const budgetOptions = [
  "Under ₹5 Lakh",
  "₹5 – 10 Lakh",
  "₹10 – 25 Lakh",
  "₹25 – 50 Lakh",
  "Above ₹50 Lakh",
];

const scopeOptions = [
  "Full Home Interiors",
  "Modular Kitchen",
  "Living Room",
  "Bedroom",
  "Office Fit-out",
  "Renovation",
  "Other",
];

const projectTypeOptions = [
  "Residential",
  "Commercial",
  "Office",
  "Retail Showroom",
  "Renovation",
];

const financialYearOptions = ["2024-25", "2025-26", "2026-27", "2027-28"];

const inputClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] placeholder:text-[#b3a594] outline-none transition focus:border-[#c4a574] focus:bg-white focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6] dark:placeholder:text-[#8a8175] dark:focus:bg-[#161411]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
        {label}
        {required ? <span className="text-[#b4534a]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="vendor-form-card overflow-visible rounded-2xl border border-[#eadfcf] bg-white dark:border-[#3a342c] dark:bg-[#161411]">
      <div className="border-b border-[#f0e8db] bg-gradient-to-r from-[#fbf8f3] to-white px-5 py-4 dark:border-[#3a342c] dark:from-[#1c1914] dark:to-[#161411]">
        <h3 className="font-serif text-[1.15rem] leading-none text-[#1c1610] dark:text-[#f4efe6]">{title}</h3>
        {hint ? <p className="mt-1.5 text-xs text-[#8a7b68]">{hint}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function LeadForm() {
  const router = useRouter();
  const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [storeId, setStoreId] = useState("");
  const [source, setSource] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [status, setStatus] = useState("NEW");
  const [budget, setBudget] = useState("");
  const [scope, setScope] = useState("");
  const [projectType, setProjectType] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [tentativeStart, setTentativeStart] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [latestRemark, setLatestRemark] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await storesApi.list({ limit: 100 });
        setStoreOptions(
          data.items.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.city})`,
          }))
        );
        if (data.items[0]) setStoreId(data.items[0].id);
      } catch {
        /* form can still submit without store */
      }
    })();
  }, []);

  const canSave = Boolean(clientName.trim() && phone.trim());

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setSuccess("");
    if (!canSave) {
      setError("Client name and phone are required.");
      return;
    }

    setLoading(true);
    try {
      await leadsApi.create({
        clientName: clientName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone || null,
        email: email || null,
        clientAddress: clientAddress || null,
        storeId: storeId || null,
        source: source || null,
        projectName: null,
        projectType: projectType || null,
        scope: scope || null,
        budget: budget || null,
        status: status || "NEW",
        financialYear: financialYear || null,
        tentativeStart:
          tentativeStart && /^\d{4}-\d{2}-\d{2}$/.test(tentativeStart)
            ? `${tentativeStart}T00:00:00.000Z`
            : null,
        tags: tags || null,
        description: description || null,
        latestRemark: latestRemark || null,
      });
      setSuccess("Lead created successfully.");
      setTimeout(() => router.push("/sales/leads"), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="vendor-form mx-auto max-w-6xl space-y-5 pb-24">
      <div>
        <Link
          href="/sales/leads"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f4efe6]"
        >
          <span aria-hidden>←</span>
          Leads
        </Link>
        <h1 className="font-serif text-3xl text-[#1c1610] dark:text-[#f4efe6]">Add lead</h1>
        <p className="mt-1 text-sm text-[#8a7b68]">
          Client name and phone are enough to save. Project details can be filled now or later.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <Section title="Client details" hint="Contact and where this enquiry came from">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Client Name" required>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </Field>
          <Field label="Phone / WhatsApp" required>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile number"
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
              className={inputClass}
            />
          </Field>
          <Field label="Alternate Phone">
            <input
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              placeholder="Optional number"
              className={inputClass}
            />
          </Field>
          <Field label="Store">
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={inputClass}>
              <option value="">Select store</option>
              {storeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lead Source">
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
              <option value="">Select lead source</option>
              {leadSourceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Client Address / City">
              <input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="City or full address"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Project details" hint="Scope, budget, and timeline for this enquiry">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Budget">
            <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass}>
              <option value="">Select budget</option>
              {budgetOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Scope">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputClass}>
              <option value="">Select scope</option>
              {scopeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project Type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputClass}>
              <option value="">Select type</option>
              {projectTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Financial Year">
            <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} className={inputClass}>
              {financialYearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tentative Start">
            <input
              type="date"
              value={tentativeStart}
              onChange={(e) => setTentativeStart(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tags">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. premium, urgent"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <Field label="Description">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about the enquiry"
                className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] focus:bg-white focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]"
              />
            </Field>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <Field label="Latest Remark">
              <textarea
                rows={3}
                value={latestRemark}
                onChange={(e) => setLatestRemark(e.target.value)}
                placeholder="Latest conversation or next step"
                className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] focus:bg-white focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6]"
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-[#eadfcf] bg-white/95 px-4 py-3 shadow-[0_14px_36px_rgba(28,22,16,0.1)] backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-[#3a342c] dark:bg-[#161411]/95">
        <p className="text-xs text-[#8a7b68]">
          {canSave ? "Ready to save this lead." : "Enter client name and phone to enable Save."}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href="/sales/leads"
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#1c1610] hover:bg-[#fbf8f3] dark:border-[#3a342c] dark:text-[#f4efe6]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !canSave}
            className="h-11 rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] hover:bg-black disabled:cursor-not-allowed disabled:bg-[#d8d0c4] disabled:text-[#8a7b68]"
          >
            {loading ? "Saving..." : "Create lead"}
          </button>
        </div>
      </div>
    </form>
  );
}
