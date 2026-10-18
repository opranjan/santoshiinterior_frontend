"use client";

import React, { useEffect, useState } from "react";
import { hrApi } from "@/services/crmApi";
import TimePickerField from "@/components/hr/TimePickerField";
import HrPageHeader from "./HrPageHeader";

const DEFAULT_CHECK_IN = "10:00";
const DEFAULT_CHECK_OUT = "19:00";

function to12h(time24: string) {
  const match = String(time24 || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "—";
  let h = Number(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function HrSettingsPage() {
  const [checkIn, setCheckIn] = useState(DEFAULT_CHECK_IN);
  const [checkOut, setCheckOut] = useState(DEFAULT_CHECK_OUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await hrApi.getSettings();
      setCheckIn(data.checkIn || DEFAULT_CHECK_IN);
      setCheckOut(data.checkOut || DEFAULT_CHECK_OUT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load working hours");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!checkIn || !checkOut) {
      setError("Set both check-in and check-out times");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const data = await hrApi.saveSettings({ checkIn, checkOut });
      setCheckIn(data.checkIn);
      setCheckOut(data.checkOut);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save working hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <HrPageHeader
        crumb="HR › Settings"
        title="Settings"
        subtitle="Company working hours used for check-in, check-out, and Late marking"
      />

      <div className="max-w-2xl rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-sm dark:border-[#3a342c] dark:bg-[#161411] sm:p-6">
        <h2
          className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Working hours
        </h2>
        <p className="mt-1 text-sm text-[#8a7b68]">
          Check-ins after the start time are marked Late on Attendance and in the
          employee app.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-[#8a7b68]">Loading hours…</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">
                Check-in
              </span>
              <TimePickerField
                id="hr-settings-check-in"
                value={checkIn}
                onChange={setCheckIn}
                placeholder="Start time"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#8a7b68]">
                Check-out
              </span>
              <TimePickerField
                id="hr-settings-check-out"
                value={checkOut}
                onChange={setCheckOut}
                placeholder="End time"
              />
            </label>
          </div>
        )}

        <p className="mt-4 text-sm text-[#5c5146]">
          Current window: <strong>{to12h(checkIn)}</strong> –{" "}
          <strong>{to12h(checkOut)}</strong>
        </p>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {saved ? (
          <p className="mt-3 text-sm text-emerald-700">Working hours saved.</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex h-11 items-center rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white hover:bg-[#b3915f] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save hours"}
          </button>
        </div>
      </div>
    </div>
  );
}
