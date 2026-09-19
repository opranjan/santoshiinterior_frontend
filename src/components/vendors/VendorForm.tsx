"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { vendorsApi, type VendorDto } from "@/services/crmApi";
import {
  VENDOR_ACCOUNT_TYPES,
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
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#E85D75] focus:outline-hidden focus:ring-3 focus:ring-[#E85D75]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const cardClass =
  "rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

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

function PhoneField({
  value,
  onChange,
  placeholder = "Enter Number",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={`${inputClass} flex items-center gap-2 pr-0`}>
      <span className="shrink-0 border-r border-gray-200 pr-2 text-sm text-gray-600">
        🇮🇳 +91
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
    void vendorsApi.categories().then(setCategories).catch(() => undefined);
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

  const canSave = Boolean(
    form.name.trim() && form.phone.trim() && form.category.length && form.workingModel
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

  const addCategory = () => {
    setManageOpen(true);
  };

  const payload = () => ({
    name: form.name.trim(),
    phone: form.phone.trim() ? `+91${form.phone.trim()}` : null,
    email: form.email.trim() || null,
    contactPerson: form.contactPerson.trim() || null,
    status: form.status || "Created",
    category: form.category,
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
      setError("Business name, phone, category, and working model are required.");
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

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "basic", label: "Basic Details" },
    { id: "location", label: "Location Details" },
    { id: "banking", label: "Banking" },
  ];

  if (loading) {
    return <p className="text-sm text-gray-500">Loading vendor...</p>;
  }

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={vendorId ? `/operations/vendors/${vendorId}` : "/operations/vendors"}
          className="inline-flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90"
        >
          <span className="text-xl">‹</span>
          {vendorId ? "Basic Details" : "Add Vendor"}
        </Link>
      </div>

      <div className="flex gap-6 border-b border-gray-100 dark:border-gray-800">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`pb-3 text-sm font-medium ${
              tab === item.id
                ? "border-b-2 border-[#E85D75] text-[#E85D75]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-600">
          {error}
        </p>
      ) : null}

      {tab === "basic" ? (
        <div className="space-y-4">
          <section className={cardClass}>
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
              Vendor Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>
                  Business Name<span className="text-error-500">*</span>
                </Label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Business Name"
                  className={`${inputClass} ${!form.name ? "border-[#E85D75]" : ""}`}
                />
              </div>
              <div>
                <Label>
                  Phone Number<span className="text-error-500">*</span>
                </Label>
                <PhoneField value={form.phone} onChange={(value) => set("phone", value)} />
              </div>
              <div>
                <Label>Email Id</Label>
                <input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Enter Email"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <input
                  value={form.contactPerson}
                  onChange={(e) => set("contactPerson", e.target.value)}
                  placeholder="Enter Contact Name"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Status</Label>
                <VendorStatusSelect
                  value={form.status}
                  onChange={(value) => set("status", value)}
                  options={VENDOR_STATUSES}
                />
              </div>
              <div>
                <Label>
                  Category<span className="text-error-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <VendorTypeSelect
                    selected={form.category}
                    onChange={(next) => set("category", next)}
                    options={categories.map((item) => ({ value: item.name, label: item.name }))}
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E85D75] text-lg font-semibold text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Alternate Detail
              </h3>
              <button
                type="button"
                onClick={() =>
                  set("alternates", [...form.alternates, { name: "", phone: "", email: "" }])
                }
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E85D75] text-sm font-semibold text-white"
              >
                +
              </button>
            </div>
            <div className="space-y-3">
              {form.alternates.map((row, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <div>
                    <Label>
                      Contact Person <span className="text-error-500">*</span>
                    </Label>
                    <input
                      value={row.name}
                      onChange={(e) => {
                        const next = [...form.alternates];
                        next[index] = { ...row, name: e.target.value };
                        set("alternates", next);
                      }}
                      placeholder="Enter Name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label>
                      Phone Number <span className="text-error-500">*</span>
                    </Label>
                    <PhoneField
                      value={row.phone.replace(/^\+91/, "")}
                      onChange={(value) => {
                        const next = [...form.alternates];
                        next[index] = { ...row, phone: value };
                        set("alternates", next);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <input
                      value={row.email}
                      onChange={(e) => {
                        const next = [...form.alternates];
                        next[index] = { ...row, email: e.target.value };
                        set("alternates", next);
                      }}
                      placeholder="Enter Email"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "alternates",
                        form.alternates.filter((_, i) => i !== index)
                      )
                    }
                    className="mt-7 h-11 text-[#E85D75]"
                    aria-label="Remove alternate contact"
                  >
                    ⌫
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
              Other Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>GST Number</Label>
                <input
                  value={form.gstin}
                  onChange={(e) => set("gstin", e.target.value)}
                  placeholder="Enter GST number"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Aadhar Number</Label>
                <input
                  value={form.aadhaar}
                  onChange={(e) => set("aadhaar", e.target.value)}
                  placeholder="Enter ID number"
                  className={inputClass}
                />
              </div>
              <div className="md:row-span-2">
                <Label>Description</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Enter Description"
                  className="h-[7.5rem] w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#E85D75] focus:outline-hidden dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <Label>Pan Number</Label>
                <input
                  value={form.pan}
                  onChange={(e) => set("pan", e.target.value)}
                  placeholder="Enter Pan number"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>
                  Working Model<span className="text-error-500">*</span>
                </Label>
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
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setTab("location")}
              className="bg-[#E85D75] hover:bg-[#d64c66]"
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "location" ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800">
            <div className="p-4">
              <input
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchPlace();
                  }
                }}
                placeholder="Type address to search"
                className={inputClass}
              />
            </div>
            <iframe
              title="Vendor location"
              src={mapSrc}
              className="h-[380px] w-full border-0"
            />
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="City"
                className={inputClass}
              />
              <input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="State"
                className={inputClass}
              />
              <input
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                placeholder="Pincode"
                className={inputClass}
              />
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Country"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void searchPlace();
                setTab("banking");
              }}
              className="flex h-12 w-full items-center justify-center bg-[#F7C8D0] text-sm font-medium text-white hover:bg-[#E85D75]"
            >
              {searchingMap ? "Searching..." : "Select and continue"}
            </button>
          </div>
        </div>
      ) : null}

      {tab === "banking" ? (
        <div className="space-y-4">
          <section className={cardClass}>
            <div className="mb-4 flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FDE8EC] text-[#E85D75]">
                ⌂
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Bank Account Details
                </h3>
                <p className="text-xs text-gray-400">
                  Used for vendor payments and settlements
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>Account Holder Name</Label>
                <input
                  value={form.bankHolderName}
                  onChange={(e) => set("bankHolderName", e.target.value)}
                  placeholder="Enter Account Holder Name"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <input
                  value={form.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                  placeholder="Enter Account Number"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <input
                  value={form.ifsc}
                  onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
                  placeholder="ENTER IFSC CODE"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Account Type</Label>
                <select
                  value={form.accountType}
                  onChange={(e) => set("accountType", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select Account Type</option>
                  {VENDOR_ACCOUNT_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Branch Address</Label>
                <input
                  value={form.branchAddress}
                  onChange={(e) => set("branchAddress", e.target.value)}
                  placeholder="Enter Branch Address"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Tax Details
              </h3>
              <p className="text-xs text-gray-400">
                TDS rate applicable to this vendor&apos;s payments
              </p>
            </div>
            <div className="max-w-sm">
              <select
                value={form.tdsSlab}
                onChange={(e) => set("tdsSlab", e.target.value)}
                className={inputClass}
              >
                <option value="">Select TDS Slab</option>
                {VENDOR_TDS_SLABS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={saving || !canSave}
              onClick={() => void save()}
              className="bg-[#E85D75] hover:bg-[#d64c66] disabled:bg-gray-200 disabled:text-gray-400"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
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
