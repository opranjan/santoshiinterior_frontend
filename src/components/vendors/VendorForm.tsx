"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vendorsApi, type VendorDto } from "@/services/crmApi";
import {
  VENDOR_ACCOUNT_TYPES,
  VENDOR_CATEGORIES,
  VENDOR_STATUSES,
  VENDOR_TDS_SLABS,
  VENDOR_WORKING_MODELS,
} from "./vendorOptions";
import VendorCategoryManager, { type VendorCategoryRow } from "./VendorCategoryManager";
import { VendorStatusSelect, VendorTypeSelect } from "./VendorSelects";

type Tab = "basic" | "location" | "banking";

type Alternate = { name: string; phone: string; email: string };

type FormState = {
  name: string;
  phone: string;
  email: string;
  contactPerson: string;
  status: string;
  category: string[];
  alternates: Alternate[];
  gstin: string;
  aadhaar: string;
  pan: string;
  notes: string;
  workingModel: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: string;
  longitude: string;
  bankHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  accountType: string;
  branchAddress: string;
  tdsSlab: string;
};

const emptyForm = (): FormState => ({
  name: "",
  phone: "",
  email: "",
  contactPerson: "",
  status: "",
  category: [],
  alternates: [{ name: "", phone: "", email: "" }],
  gstin: "",
  aadhaar: "",
  pan: "",
  notes: "",
  workingModel: "Labour + Material only",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  latitude: "22.7196",
  longitude: "75.8577",
  bankHolderName: "",
  bankAccountNumber: "",
  ifsc: "",
  accountType: "",
  branchAddress: "",
  tdsSlab: "",
});

const inputClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] placeholder:text-[#b3a594] outline-none transition focus:border-[#c4a574] focus:bg-white focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6] dark:placeholder:text-[#8a8175] dark:focus:bg-[#161411]";

function fromVendor(row: VendorDto): FormState {
  const contacts = Array.isArray(row.alternateContacts)
    ? row.alternateContacts.map((item) => ({
        name: item.name || "",
        phone: item.phone || "",
        email: item.email || "",
      }))
    : [];
  return {
    ...emptyForm(),
    name: row.name || "",
    phone: (row.phone || "").replace(/^\+91\s?/, ""),
    email: row.email || "",
    contactPerson: row.contactPerson || "",
    status: row.status || "",
    category: row.categories?.length
      ? row.categories
      : row.category
        ? row.category.split(" | ").map((item) => item.trim()).filter(Boolean)
        : [],
    alternates: contacts.length ? contacts : [{ name: "", phone: "", email: "" }],
    gstin: row.gstin || "",
    aadhaar: row.aadhaar || "",
    pan: row.pan || "",
    notes: row.notes || "",
    workingModel: row.workingModel || "Labour + Material only",
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "India",
    pincode: row.pincode || "",
    latitude: row.latitude != null ? String(row.latitude) : "22.7196",
    longitude: row.longitude != null ? String(row.longitude) : "75.8577",
    bankHolderName: row.bankHolderName || "",
    bankAccountNumber: row.bankAccountNumber || "",
    ifsc: row.ifsc || "",
    accountType: row.accountType || "",
    branchAddress: row.branchAddress || "",
    tdsSlab: row.tdsSlab || "",
  };
}

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

function PhoneField({
  value,
  onChange,
  placeholder = "10-digit mobile",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={`${inputClass} flex items-center gap-2 pr-0`}>
      <span className="shrink-0 rounded-l-xl border-r border-[#eadfcf] bg-[#f6f0e6] px-2.5 py-2 text-xs font-semibold text-[#6f6254]">
        +91
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
        placeholder={placeholder}
        className="h-full w-full bg-transparent pr-3 outline-none"
      />
    </div>
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
    <section className="vendor-form-card overflow-visible rounded-2xl border border-[#eadfcf] bg-white shadow-[0_10px_28px_rgba(28,22,16,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-[#f0e8db] bg-gradient-to-r from-[#fbf8f3] to-white px-5 py-4">
        <div>
          <h3 className="font-serif text-[1.15rem] leading-none text-[#1c1610]">{title}</h3>
          {hint ? <p className="mt-1.5 text-xs text-[#8a7b68]">{hint}</p> : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function VendorForm({ vendorId }: { vendorId?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basic");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<VendorCategoryRow[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(vendorId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [searchingMap, setSearchingMap] = useState(false);

  useEffect(() => {
    void vendorsApi
      .categories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await vendorsApi.get(vendorId);
        if (!cancelled) {
          setForm(fromVendor(row));
          if (row.address) setMapQuery(row.address);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load vendor");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const categoryOptions = useMemo(
    () =>
      categories.length
        ? categories.map((item) => ({ value: item.name, label: item.name }))
        : VENDOR_CATEGORIES.map((name) => ({ value: name, label: name })),
    [categories]
  );

  const resolvedCategory = form.category.length
    ? form.category
    : categoryOptions.slice(0, 1).map((item) => item.value);

  const canSave = Boolean(
    form.name.trim() && form.phone.replace(/\D/g, "").length >= 10 && form.workingModel
  );

  const mapSrc = useMemo(() => {
    const lat = Number(form.latitude) || 22.7196;
    const lng = Number(form.longitude) || 75.8577;
    const delta = 0.02;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [form.latitude, form.longitude]);

  const searchPlace = async () => {
    const q = mapQuery.trim();
    if (!q) return;
    try {
      setSearchingMap(true);
      setError("");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      const rows = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      const hit = rows[0];
      if (!hit) {
        setError("No place found for that address");
        return;
      }
      set("latitude", hit.lat);
      set("longitude", hit.lon);
      set("address", hit.display_name);
      const parts = hit.display_name.split(",").map((p) => p.trim());
      if (parts.length > 1) set("city", parts[0]);
    } catch {
      setError("Could not search the map. Enter the address and continue.");
      set("address", q);
    } finally {
      setSearchingMap(false);
    }
  };

  const payload = () => ({
    name: form.name.trim(),
    phone: form.phone.trim() ? `+91${form.phone.trim()}` : null,
    email: form.email.trim() || null,
    contactPerson: form.contactPerson.trim() || null,
    status: form.status || "Created",
    category: resolvedCategory,
    alternateContacts: form.alternates
      .filter((row) => row.name.trim() || row.phone.trim() || row.email.trim())
      .map((row) => ({
        name: row.name.trim(),
        phone: row.phone.trim() ? `+91${row.phone.replace(/^\+91/, "")}` : "",
        email: row.email.trim(),
      })),
    gstin: form.gstin.trim() || null,
    aadhaar: form.aadhaar.trim() || null,
    pan: form.pan.trim() || null,
    notes: form.notes.trim() || null,
    workingModel: form.workingModel || null,
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    country: form.country || "India",
    pincode: form.pincode.trim() || null,
    latitude: form.latitude ? Number(form.latitude) : null,
    longitude: form.longitude ? Number(form.longitude) : null,
    bankHolderName: form.bankHolderName.trim() || null,
    bankAccountNumber: form.bankAccountNumber.trim() || null,
    ifsc: form.ifsc.trim() || null,
    accountType: form.accountType || null,
    branchAddress: form.branchAddress.trim() || null,
    tdsSlab: form.tdsSlab || null,
  });

  const save = async () => {
    if (!canSave) {
      setError("Business name and a 10-digit phone number are required.");
      setTab("basic");
      return;
    }
    try {
      setSaving(true);
      setError("");
      if (vendorId) {
        await vendorsApi.update(vendorId, payload());
        router.push(`/operations/vendors/${vendorId}`);
      } else {
        const created = await vendorsApi.create(payload());
        router.push(`/operations/vendors/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; hint: string }> = [
    { id: "basic", label: "Basic Details", hint: "Identity & contacts" },
    { id: "location", label: "Location", hint: "Address on map" },
    { id: "banking", label: "Banking", hint: "Payments & TDS" },
  ];
  const tabIndex = tabs.findIndex((item) => item.id === tab);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-5 py-10 text-center text-sm text-[#8a7b68]">
        Loading vendor...
      </div>
    );
  }

  const backHref = vendorId ? `/operations/vendors/${vendorId}` : "/operations/vendors";

  return (
    <>
      <div className="vendor-form mx-auto max-w-6xl space-y-5 pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={backHref}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610]"
            >
              <span aria-hidden>←</span>
              Vendors
            </Link>
            <h1 className="font-serif text-3xl text-[#1c1610]">
              {vendorId ? "Edit vendor" : "Add vendor"}
            </h1>
            <p className="mt-1 text-sm text-[#8a7b68]">
              Complete the three steps. Name and phone are enough to save; banking can be filled later.
            </p>
          </div>
        </div>

        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tabs.map((item, index) => {
            const active = tab === item.id;
            const done = tabIndex > index;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[#c4a574] bg-[#1c1610] text-[#f6efe4] shadow-[0_12px_24px_rgba(28,22,16,0.16)]"
                    : done
                      ? "border-[#eadfcf] bg-white text-[#1c1610]"
                      : "border-[#eadfcf] bg-[#fbf8f3] text-[#8a7b68] hover:border-[#c4a574] hover:bg-white"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-[#c4a574] text-[#1c1610]"
                      : done
                        ? "bg-[#efe4d2] text-[#1c1610] dark:bg-[#c4a574]/20 dark:text-[#e8d5b5]"
                        : "bg-[#efe4d2] text-[#8a7b68] dark:bg-[#c4a574]/15 dark:text-[#c4a574]"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`block text-[11px] ${active ? "text-[#d8c4a4]" : "text-[#a0907c]"}`}>
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {tab === "basic" ? (
          <div className="space-y-4">
            <Section title="Vendor details" hint="Primary identity used across orders and payments">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Business Name" required>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Business name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone Number" required>
                  <PhoneField value={form.phone} onChange={(value) => set("phone", value)} />
                </Field>
                <Field label="Email Id">
                  <input
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="name@company.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Contact Person">
                  <input
                    value={form.contactPerson}
                    onChange={(e) => set("contactPerson", e.target.value)}
                    placeholder="Primary contact"
                    className={inputClass}
                  />
                </Field>
                <Field label="Status">
                  <VendorStatusSelect
                    value={form.status}
                    onChange={(value) => set("status", value)}
                    options={VENDOR_STATUSES}
                  />
                </Field>
                <Field label="Category" required>
                  <div className="flex gap-2">
                    <VendorTypeSelect
                      selected={form.category}
                      onChange={(next) => set("category", next)}
                      options={categoryOptions}
                    />
                    <button
                      type="button"
                      onClick={() => setManageOpen(true)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1c1610] text-lg font-semibold text-[#e8d5b5] hover:bg-black"
                      aria-label="Manage categories"
                    >
                      +
                    </button>
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Alternate contacts" hint="Optional extra people for this vendor">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    set("alternates", [...form.alternates, { name: "", phone: "", email: "" }])
                  }
                  className="inline-flex h-8 items-center rounded-full border border-[#eadfcf] bg-[#fbf8f3] px-3 text-xs font-semibold text-[#1c1610] hover:border-[#c4a574]"
                >
                  + Add contact
                </button>
              </div>
              <div className="space-y-3">
                {form.alternates.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-4 rounded-xl border border-[#f0e8db] bg-[#fdfbf7] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <Field label="Contact Person">
                      <input
                        value={row.name}
                        onChange={(e) => {
                          const next = [...form.alternates];
                          next[index] = { ...row, name: e.target.value };
                          set("alternates", next);
                        }}
                        placeholder="Name"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Phone Number">
                      <PhoneField
                        value={row.phone.replace(/^\+91/, "")}
                        onChange={(value) => {
                          const next = [...form.alternates];
                          next[index] = { ...row, phone: value };
                          set("alternates", next);
                        }}
                      />
                    </Field>
                    <Field label="Email Address">
                      <input
                        value={row.email}
                        onChange={(e) => {
                          const next = [...form.alternates];
                          next[index] = { ...row, email: e.target.value };
                          set("alternates", next);
                        }}
                        placeholder="Email"
                        className={inputClass}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "alternates",
                          form.alternates.length > 1
                            ? form.alternates.filter((_, i) => i !== index)
                            : [{ name: "", phone: "", email: "" }]
                        )
                      }
                      className="mt-6 h-11 rounded-xl px-3 text-sm text-[#8a7b68] hover:bg-white hover:text-[#b4534a]"
                      aria-label="Remove alternate contact"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Other details" hint="Tax IDs and how this vendor works">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="GST Number">
                  <input
                    value={form.gstin}
                    onChange={(e) => set("gstin", e.target.value)}
                    placeholder="GSTIN"
                    className={inputClass}
                  />
                </Field>
                <Field label="Aadhar Number">
                  <input
                    value={form.aadhaar}
                    onChange={(e) => set("aadhaar", e.target.value)}
                    placeholder="Aadhaar"
                    className={inputClass}
                  />
                </Field>
                <div className="md:row-span-2">
                  <Field label="Description">
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="Notes about this vendor"
                      className="h-[7.5rem] w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] focus:bg-white focus:ring-4 focus:ring-[#c4a574]/15 dark:border-[#3a342c] dark:bg-[#1c1914] dark:text-[#f4efe6] dark:focus:bg-[#161411]"
                    />
                  </Field>
                </div>
                <Field label="Pan Number">
                  <input
                    value={form.pan}
                    onChange={(e) => set("pan", e.target.value)}
                    placeholder="PAN"
                    className={inputClass}
                  />
                </Field>
                <Field label="Working Model" required>
                  <select
                    value={form.workingModel}
                    onChange={(e) => set("workingModel", e.target.value)}
                    className={inputClass}
                  >
                    {VENDOR_WORKING_MODELS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>
          </div>
        ) : null}

        {tab === "location" ? (
          <Section title="Location details" hint="Search an address, then confirm city and pincode">
            <div className="overflow-hidden rounded-xl border border-[#eadfcf]">
              <div className="flex flex-col gap-2 border-b border-[#eadfcf] bg-[#fbf8f3] p-3 sm:flex-row">
                <input
                  value={mapQuery}
                  onChange={(e) => setMapQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchPlace();
                    }
                  }}
                  placeholder="Search address, landmark or city"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => void searchPlace()}
                  className="h-11 shrink-0 rounded-xl bg-[#1c1610] px-4 text-sm font-semibold text-[#e8d5b5] hover:bg-black"
                >
                  {searchingMap ? "Searching..." : "Find on map"}
                </button>
              </div>
              <iframe title="Vendor location" src={mapSrc} className="h-[340px] w-full border-0" />
              <div className="grid grid-cols-1 gap-3 bg-white p-4 md:grid-cols-4">
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="City"
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    placeholder="State"
                    className={inputClass}
                  />
                </Field>
                <Field label="Pincode">
                  <input
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value)}
                    placeholder="Pincode"
                    className={inputClass}
                  />
                </Field>
                <Field label="Country">
                  <input
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    placeholder="Country"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </Section>
        ) : null}

        {tab === "banking" ? (
          <div className="space-y-4">
            <Section title="Bank account details" hint="Used for vendor payments and settlements">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Account Holder Name">
                  <input
                    value={form.bankHolderName}
                    onChange={(e) => set("bankHolderName", e.target.value)}
                    placeholder="Account holder name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Account Number">
                  <input
                    value={form.bankAccountNumber}
                    onChange={(e) => set("bankAccountNumber", e.target.value)}
                    placeholder="Account number"
                    className={inputClass}
                  />
                </Field>
                <Field label="IFSC Code">
                  <input
                    value={form.ifsc}
                    onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
                    placeholder="IFSC"
                    className={inputClass}
                  />
                </Field>
                <Field label="Account Type">
                  <select
                    value={form.accountType}
                    onChange={(e) => set("accountType", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select account type</option>
                    {VENDOR_ACCOUNT_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Branch Address">
                    <input
                      value={form.branchAddress}
                      onChange={(e) => set("branchAddress", e.target.value)}
                      placeholder="Branch address"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Section title="Tax details" hint="TDS rate applicable to this vendor's payments">
              <div className="max-w-sm">
                <Field label="TDS slab">
                  <select
                    value={form.tdsSlab}
                    onChange={(e) => set("tdsSlab", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select TDS slab</option>
                    {VENDOR_TDS_SLABS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>
          </div>
        ) : null}

        <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-[#eadfcf] bg-white/95 px-4 py-3 shadow-[0_14px_36px_rgba(28,22,16,0.1)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#8a7b68]">
            {canSave
              ? "Ready to save. Category defaults to the first type if none is selected."
              : "Enter business name and a 10-digit phone to enable Save."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {tab !== "basic" ? (
              <button
                type="button"
                onClick={() => setTab(tab === "banking" ? "location" : "basic")}
                className="h-11 rounded-xl border border-[#eadfcf] px-4 text-sm font-semibold text-[#1c1610] hover:bg-[#fbf8f3]"
              >
                Back
              </button>
            ) : null}
            {tab !== "banking" ? (
              <button
                type="button"
                onClick={() => setTab(tab === "basic" ? "location" : "banking")}
                className="h-11 rounded-xl border border-[#c4a574] bg-[#fbf8f3] px-4 text-sm font-semibold text-[#1c1610] hover:bg-[#efe4d2]"
              >
                Continue
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving || !canSave}
              onClick={() => void save()}
              className="h-11 rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] hover:bg-black disabled:cursor-not-allowed disabled:bg-[#d8d0c4] disabled:text-[#8a7b68]"
            >
              {saving ? "Saving..." : "Save vendor"}
            </button>
          </div>
        </div>
      </div>
      <VendorCategoryManager
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        categories={categories}
        onChange={(next) => {
          setCategories(next);
          const names = new Set(next.map((row) => row.name));
          setForm((prev) => ({
            ...prev,
            category: prev.category.filter((item) => names.has(item)),
          }));
        }}
      />
    </>
  );
}
