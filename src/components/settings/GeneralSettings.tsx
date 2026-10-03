"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { settingsApi, storesApi } from "@/services/crmApi";

const SETTINGS_KEY = "general";

type GeneralValue = {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  defaultStoreId: string;
  fiscalStart: string;
  emailNotify: boolean;
  whatsappNotify: boolean;
  leadAutoId: boolean;
};

const defaults: GeneralValue = {
  companyName: "Santoshi Interior",
  tagline: "Multi-store Interior Design & Turnkey Solutions",
  email: "hello@santoshiinterior.com",
  phone: "+91 90963 32191",
  address: "Indore, Madhya Pradesh, India",
  currency: "INR",
  timezone: "Asia/Kolkata",
  dateFormat: "DD-MMM-YY",
  defaultStoreId: "",
  fiscalStart: "April",
  emailNotify: true,
  whatsappNotify: true,
  leadAutoId: true,
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const selectClass = `${fieldClass} appearance-none`;
const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";
const toggleRow =
  "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#eadfcf] bg-white px-4 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]";

export default function GeneralSettings() {
  const [form, setForm] = useState<GeneralValue>(defaults);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [setting, storeList] = await Promise.all([
          settingsApi.getByKey(SETTINGS_KEY),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStores(storeList.items.map((s) => ({ id: s.id, name: s.name })));
        const value =
          setting.value && typeof setting.value === "object"
            ? (setting.value as Partial<GeneralValue>)
            : {};
        setForm({ ...defaults, ...value });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load settings"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = <K extends keyof GeneralValue>(
    key: K,
    value: GeneralValue[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      await settingsApi.upsertByKey(SETTINGS_KEY, form);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/settings"
            className="mb-2 inline-flex text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
          >
            ← Settings
          </Link>
          <h1
            className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            General settings
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Company profile, locale, and CRM defaults used across stores.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="text-sm text-[#8a7b68]">Loading settings…</div>
      ) : null}

      <section className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">01</p>
        <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Company profile
        </h2>
        <p className="mt-1 text-xs text-[#8a7b68]">Shown on quotations, PDFs, and client communication</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="companyName">Company name</label>
            <input id="companyName" type="text" value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="tagline">Tagline</label>
            <input id="tagline" type="text" value={form.tagline} onChange={(e) => setField("tagline", e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">Support email</label>
            <input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">Phone / WhatsApp</label>
            <input id="phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={fieldClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="address">Business address</label>
            <input id="address" type="text" value={form.address} onChange={(e) => setField("address", e.target.value)} className={fieldClass} />
          </div>
        </div>
      </section>

      <section className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">02</p>
        <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Locale & display
        </h2>
        <p className="mt-1 text-xs text-[#8a7b68]">Currency, timezone, and date format for reports and tables</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>Currency</label>
            <select value={form.currency} onChange={(e) => setField("currency", e.target.value)} className={selectClass}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <select value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} className={selectClass}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date format</label>
            <select value={form.dateFormat} onChange={(e) => setField("dateFormat", e.target.value)} className={selectClass}>
              <option value="DD-MMM-YY">26-Jul-26</option>
              <option value="DD/MM/YYYY">26/07/2026</option>
              <option value="YYYY-MM-DD">2026-07-26</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Fiscal year starts</label>
            <select value={form.fiscalStart} onChange={(e) => setField("fiscalStart", e.target.value)} className={selectClass}>
              <option>April</option>
              <option>January</option>
              <option>July</option>
            </select>
          </div>
        </div>
      </section>

      <section className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c4a574]">03</p>
        <h2 className="mt-1 font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          CRM defaults
        </h2>
        <p className="mt-1 text-xs text-[#8a7b68]">Store and ID behaviour for new leads and projects</p>
        <div className="mt-5 max-w-md">
          <label className={labelClass}>Default store</label>
          <select value={form.defaultStoreId} onChange={(e) => setField("defaultStoreId", e.target.value)} className={selectClass}>
            <option value="">No default</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 space-y-3">
          <label className={toggleRow}>
            <div>
              <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">Auto-generate Lead IDs</p>
              <p className="text-xs text-[#8a7b68]">Create IDs like LD-752 when a new lead is saved</p>
            </div>
            <input type="checkbox" checked={form.leadAutoId} onChange={(e) => setField("leadAutoId", e.target.checked)} className="h-4 w-4 accent-[#1c1610]" />
          </label>
          <label className={toggleRow}>
            <div>
              <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">Email notifications</p>
              <p className="text-xs text-[#8a7b68]">Notify assignees on new lead / follow-up updates</p>
            </div>
            <input type="checkbox" checked={form.emailNotify} onChange={(e) => setField("emailNotify", e.target.checked)} className="h-4 w-4 accent-[#1c1610]" />
          </label>
          <label className={toggleRow}>
            <div>
              <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">WhatsApp notifications</p>
              <p className="text-xs text-[#8a7b68]">Send follow-up reminders on WhatsApp when enabled</p>
            </div>
            <input type="checkbox" checked={form.whatsappNotify} onChange={(e) => setField("whatsappNotify", e.target.checked)} className="h-4 w-4 accent-[#1c1610]" />
          </label>
        </div>
      </section>

      <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-3 border-t border-[#eadfcf] bg-[#fbf8f3]/95 px-1 py-3 backdrop-blur-sm dark:border-[#3a342c] dark:bg-[#161411]/95">
        {saved ? <span className="mr-auto text-sm font-medium text-emerald-700 dark:text-emerald-300">Saved</span> : null}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-6 text-sm font-semibold text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
