"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
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

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Loading settings…</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            General Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Company profile, locale, and CRM defaults used across stores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm font-medium text-success-600">Saved</span>
          )}
          <Button size="sm" onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Company profile
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Shown on quotations, PDFs, and client communication
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              type="text"
              value={form.tagline}
              onChange={(e) => setField("tagline", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Support Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone / WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Business Address</Label>
            <Input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Locale & display
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Currency, timezone, and date format for reports and tables
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Currency</Label>
            <select
              value={form.currency}
              onChange={(e) => setField("currency", e.target.value)}
              className={selectClass}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <Label>Timezone</Label>
            <select
              value={form.timezone}
              onChange={(e) => setField("timezone", e.target.value)}
              className={selectClass}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <Label>Date Format</Label>
            <select
              value={form.dateFormat}
              onChange={(e) => setField("dateFormat", e.target.value)}
              className={selectClass}
            >
              <option value="DD-MMM-YY">26-Jul-26</option>
              <option value="DD/MM/YYYY">26/07/2026</option>
              <option value="YYYY-MM-DD">2026-07-26</option>
            </select>
          </div>
          <div>
            <Label>Fiscal Year Starts</Label>
            <select
              value={form.fiscalStart}
              onChange={(e) => setField("fiscalStart", e.target.value)}
              className={selectClass}
            >
              <option>April</option>
              <option>January</option>
              <option>July</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          CRM defaults
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Store and ID behaviour for new leads and projects
        </p>

        <div className="mt-5 max-w-md">
          <Label>Default Store</Label>
          <select
            value={form.defaultStoreId}
            onChange={(e) => setField("defaultStoreId", e.target.value)}
            className={selectClass}
          >
            <option value="">No default</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Auto-generate Lead IDs
              </p>
              <p className="text-xs text-gray-500">
                Create IDs like LD-752 when a new lead is saved
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.leadAutoId}
              onChange={(e) => setField("leadAutoId", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Email notifications
              </p>
              <p className="text-xs text-gray-500">
                Notify assignees on new lead / follow-up updates
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.emailNotify}
              onChange={(e) => setField("emailNotify", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                WhatsApp notifications
              </p>
              <p className="text-xs text-gray-500">
                Send follow-up reminders on WhatsApp when enabled
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.whatsappNotify}
              onChange={(e) => setField("whatsappNotify", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
