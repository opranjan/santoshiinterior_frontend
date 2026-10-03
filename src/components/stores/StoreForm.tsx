"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { storesApi, usersApi } from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { labelToEnum } from "@/lib/mappers";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none transition focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none transition focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

type ManagerOption = { id: string; name: string };

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label}
        {required ? <span className="ml-1 text-[#b45309]">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="vendor-form-card overflow-visible rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">
        {kicker}
      </p>
      <h2
        className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function StoreForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Madhya Pradesh");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [status, setStatus] = useState("Active");
  const [openedOn, setOpenedOn] = useState("");
  const [gstin, setGstin] = useState("");
  const [workingHours, setWorkingHours] = useState(
    "Mon–Sat · 10:00 AM – 7:00 PM"
  );
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const users = await usersApi.list({ limit: 100, isActive: "true" });
        setManagers(
          users.items.map((u) => ({ id: u.id, name: u.name || u.email }))
        );
      } catch {
        /* optional */
      }
    })();
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const store = await storesApi.get(editId);
        setName(store.name);
        setCode(store.code);
        setCity(store.city);
        setState(store.state || "Madhya Pradesh");
        setPincode(store.pincode || "");
        setAddress(store.address || "");
        setPhone(store.phone);
        setEmail(store.email || "");
        setManagerId(store.managerId || "");
        setStatus(
          store.status === "COMING_SOON"
            ? "Coming Soon"
            : store.status === "INACTIVE"
              ? "Inactive"
              : "Active"
        );
        setOpenedOn(store.openedOn ? store.openedOn.slice(0, 10) : "");
        setGstin(store.gstin || "");
        setWorkingHours(store.workingHours || "");
        setNotes(store.notes || "");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load store");
      }
    })();
  }, [editId]);

  const canSave =
    Boolean(name.trim()) &&
    Boolean(code.trim()) &&
    Boolean(city.trim()) &&
    Boolean(phone.trim());

  const buildPayload = () => {
    const openedOnValue =
      openedOn &&
      /^\d{4}-\d{2}-\d{2}$/.test(openedOn) &&
      Number(openedOn.slice(0, 4)) >= 1900
        ? `${openedOn}T00:00:00.000Z`
        : null;

    return {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: city.trim(),
      state,
      pincode: pincode || null,
      address: address || null,
      phone: phone.trim(),
      email: email || null,
      managerId: managerId || null,
      status: labelToEnum(status),
      openedOn: openedOnValue,
      gstin: gstin || null,
      workingHours: workingHours || null,
      notes: notes || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg("");
    setError("");
    if (!name.trim() || !city.trim() || !phone.trim()) {
      setError("Please fill Store Name, City and Phone.");
      return;
    }
    if (!code.trim()) {
      setError("Store Code is required.");
      return;
    }

    setLoading(true);
    const payload = buildPayload();

    try {
      if (isEdit && editId) {
        await storesApi.update(editId, payload);
        setSavedMsg(`Store “${name}” updated successfully.`);
      } else {
        await storesApi.create(payload);
        setSavedMsg(`Store “${name}” added successfully.`);
        setTimeout(() => router.push("/stores"), 700);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save store");
    } finally {
      setLoading(false);
    }
  };

  const closeStore = async () => {
    if (!editId) return;
    setBusyAction(true);
    setError("");
    try {
      await storesApi.update(editId, { status: "INACTIVE" });
      setStatus("Inactive");
      setSavedMsg("Store closed successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close store");
    } finally {
      setBusyAction(false);
    }
  };

  const reopenStore = async () => {
    if (!editId) return;
    setBusyAction(true);
    setError("");
    try {
      await storesApi.update(editId, { status: "ACTIVE" });
      setStatus("Active");
      setSavedMsg("Store reopened successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reopen store");
    } finally {
      setBusyAction(false);
    }
  };

  const deleteStore = async () => {
    if (!editId) return;
    setBusyAction(true);
    setError("");
    try {
      await storesApi.remove(editId);
      router.push("/stores");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete store");
      setConfirmDelete(false);
    } finally {
      setBusyAction(false);
    }
  };

  const opBtn =
    "inline-flex h-10 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] transition hover:border-[#c4a574] disabled:opacity-50 dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";

  return (
    <form className="vendor-form space-y-5 pb-24" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            {isEdit ? "Locations" : "New location"}
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {isEdit ? "Edit store" : "Add store"}
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Identity used across leads, quotations, projects and reports.
          </p>
        </div>
        <Link
          href="/stores"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        >
          All stores
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {savedMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {savedMsg}
        </div>
      ) : null}

      <Section kicker="01" title="Store identity">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Store name" required>
            <input
              id="name"
              type="text"
              placeholder="e.g. Main Branch / North Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Store code" required>
            <input
              id="code"
              type="text"
              placeholder="e.g. IND-MAIN"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive (Closed)</option>
              <option value="Coming Soon">Coming Soon</option>
            </select>
          </Field>
          <Field label="Store manager">
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Opened on">
            <input
              id="openedOn"
              type="date"
              value={openedOn}
              onChange={(e) => setOpenedOn(e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
      </Section>

      <Section kicker="02" title="Location & contact">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="City" required>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="State">
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Pincode">
            <input
              id="pincode"
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Phone" required>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="GSTIN">
            <input
              id="gstin"
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Working hours" className="md:col-span-2">
            <input
              id="workingHours"
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 py-2.5 text-sm text-[#1c1610] outline-none transition focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            />
          </Field>
        </div>
      </Section>

      {isEdit ? (
        <Section kicker="03" title="Store operations">
          <div className="flex flex-wrap gap-2">
            {status !== "Inactive" ? (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void closeStore()}
                className={opBtn}
              >
                Close store
              </button>
            ) : (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void reopenStore()}
                className={opBtn}
              >
                Reopen store
              </button>
            )}
            <button
              type="button"
              disabled={busyAction}
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-[#1a1714] dark:text-red-300"
            >
              Delete store
            </button>
          </div>
          <p className="mt-3 text-xs text-[#8a7b68]">
            Closing marks the store inactive. Delete only works when there are
            no linked leads, projects, quotations, or team members.
          </p>
        </Section>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-3 border-t border-[#eadfcf] bg-[#fbf8f3]/95 px-1 py-3 backdrop-blur-sm dark:border-[#3a342c] dark:bg-[#161411]/95">
        <Link
          href="/stores"
          className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-5 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !canSave}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-6 text-sm font-semibold text-[#e8d5b5] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {loading ? "Saving..." : isEdit ? "Update store" : "Add store"}
        </button>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <h3
              className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Delete store?
            </h3>
            <p className="mt-2 text-sm text-[#8a7b68]">
              Permanently delete <strong className="text-[#1c1610] dark:text-[#f3ece2]">{name || "this store"}</strong>? This
              cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setConfirmDelete(false)}
                className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-[#8a7b68] hover:bg-[#eadfcf]/50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void deleteStore()}
                className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              >
                {busyAction ? "Deleting…" : "Delete store"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
