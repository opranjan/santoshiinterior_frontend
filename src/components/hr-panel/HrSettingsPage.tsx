"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  hrApi,
  type HrCheckInLocation,
  type HrHoliday,
  type HrLeaveType,
  type StoreDto,
} from "@/services/crmApi";
import TimePickerField from "@/components/hr/TimePickerField";
import HrPageHeader from "./HrPageHeader";

const HrCheckInMapPicker = dynamic(() => import("./HrCheckInMapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] text-sm text-[#8a7b68]">
      Loading map…
    </div>
  ),
});

const DEFAULT_CHECK_IN = "10:00";
const DEFAULT_CHECK_OUT = "19:00";
const WEEKDAYS = [
  { day: 0, label: "Sunday" },
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
];

function leaveTypeIconWrap(children: React.ReactNode) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(28,22,16,0.06)]">
      {children}
    </span>
  );
}

function leaveTypeLook(name: string) {
  const key = name.toLowerCase();
  if (key.includes("sick")) {
    return {
      wrap: "bg-[#f8e8ea]",
      icon: leaveTypeIconWrap(
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-[#e05b63]" fill="currentColor">
          <path d="M10.2 4.2h3.6v5.4h5.4v3.6h-5.4v5.4h-3.6v-5.4H4.8V9.6h5.4z" />
        </svg>
      ),
    };
  }
  if (key.includes("earned") || key.includes("privilege")) {
    return {
      wrap: "bg-[#f4eadc]",
      icon: leaveTypeIconWrap(
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-[#c4a574]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M4 10h16M8 3.5v4M16 3.5v4" />
        </svg>
      ),
    };
  }
  return {
    wrap: "bg-[#f6e8e0]",
    icon: leaveTypeIconWrap(
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#2f9a4a]" fill="currentColor">
        <path d="M12.7 12.2c2.6-.4 5.4.3 7.3 2.2-1.8-4.2-5-6.2-7.3-6.6 1.8-1.8 4.8-2.6 7.3-1.5-2.8-2.4-6.4-1.8-7.3.2C11.8 5 8.2 4.4 5.4 6.8 7.9 5.7 10.9 6.5 12.7 8.3c-2.3.4-5.5 2.4-7.3 6.6 1.9-1.9 4.7-2.6 7.3-2.2z" />
        <path d="M11.35 12.4h1.3V21h-1.3z" />
      </svg>
    ),
  };
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6efe4] text-[#c4a574]">
      {children}
    </span>
  );
}

function to12h(time24: string) {
  const match = String(time24 || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "—";
  let h = Number(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

const emptyDraft = {
  storeId: "",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radiusMeters: "200",
};

function typeDaysTotal(types: HrLeaveType[]) {
  return types.reduce((sum, row) => sum + Number(row.days || 0), 0);
}

function quotaFromTypes(savedQuota: unknown, types: HrLeaveType[]) {
  const typeTotal = typeDaysTotal(types);
  const saved = Number(savedQuota);
  if (!Number.isFinite(saved) || saved <= 0) return String(typeTotal || 12);
  if (saved === 12 && typeTotal > 12) return String(typeTotal);
  return String(saved);
}

function storeAddress(store: StoreDto) {
  return [store.address, store.city, store.state, store.pincode].filter(Boolean).join(", ");
}

async function geocodeAddress(text: string) {
  const query = text.trim();
  if (!query) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const lat = Number(rows[0]?.lat);
  const lon = Number(rows[0]?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

export default function HrSettingsPage() {
  const [checkIn, setCheckIn] = useState(DEFAULT_CHECK_IN);
  const [checkOut, setCheckOut] = useState(DEFAULT_CHECK_OUT);
  const [graceMinutes, setGraceMinutes] = useState("0");
  const [fullDayHours, setFullDayHours] = useState("8");
  const [halfDayHours, setHalfDayHours] = useState("4");
  const [belowHalfDay, setBelowHalfDay] = useState<"HALF_DAY" | "ABSENT">("HALF_DAY");
  const [locations, setLocations] = useState<HrCheckInLocation[]>([]);
  const [weeklyOffs, setWeeklyOffs] = useState<number[]>([0, 6]);
  const [holidays, setHolidays] = useState<HrHoliday[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [leaveQuotaDays, setLeaveQuotaDays] = useState("12");
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([]);
  const [typeName, setTypeName] = useState("");
  const [typeDays, setTypeDays] = useState("6");
  const [branches, setBranches] = useState<StoreDto[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [openHours, setOpenHours] = useState(true);
  const [openCalendar, setOpenCalendar] = useState(true);
  const [openLeave, setOpenLeave] = useState(true);
  const [openLocations, setOpenLocations] = useState(true);
  const [addingType, setAddingType] = useState(false);
  const [mapQuery, setMapQuery] = useState("");
  const [mapSearching, setMapSearching] = useState(false);
  const [mapLocating, setMapLocating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, storeData] = await Promise.all([
        hrApi.getSettings(),
        hrApi.listBranches().catch(() => ({ items: [] as StoreDto[] })),
      ]);
      setCheckIn(data.checkIn || DEFAULT_CHECK_IN);
      setCheckOut(data.checkOut || DEFAULT_CHECK_OUT);
      setGraceMinutes(String(data.graceMinutes ?? 0));
      setFullDayHours(String(data.fullDayHours ?? 8));
      setHalfDayHours(String(data.halfDayHours ?? 4));
      setBelowHalfDay(data.belowHalfDay === "ABSENT" ? "ABSENT" : "HALF_DAY");
      setLocations(Array.isArray(data.locations) ? data.locations : []);
      setWeeklyOffs(Array.isArray(data.weeklyOffs) ? data.weeklyOffs : [0, 6]);
      setHolidays(Array.isArray(data.holidays) ? data.holidays : []);
      const types = Array.isArray(data.leaveTypes) ? data.leaveTypes : [];
      const quota = quotaFromTypes(data.leaveQuotaDays, types);
      setLeaveQuotaDays(quota);
      setLeaveTypes(types);
      if (quota !== String(data.leaveQuotaDays ?? "") && types.length) {
        void hrApi.saveSettings({ leaveQuotaDays: Number(quota), leaveTypes: types }).catch(() => {});
      }
      setBranches((storeData.items || []).filter((row) => String(row.status || "").toUpperCase() !== "INACTIVE"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const flash = (message: string) => {
    setSaved(message);
    window.setTimeout(() => setSaved(""), 1800);
  };

  const saveHours = async () => {
    if (!checkIn || !checkOut) {
      setError("Set both check-in and check-out times");
      return;
    }
    setSavingHours(true);
    setError("");
    try {
      const data = await hrApi.saveSettings({
        checkIn,
        checkOut,
        graceMinutes: Number(graceMinutes),
        fullDayHours: Number(fullDayHours),
        halfDayHours: Number(halfDayHours),
        belowHalfDay,
      });
      setCheckIn(data.checkIn);
      setCheckOut(data.checkOut);
      setGraceMinutes(String(data.graceMinutes ?? 0));
      setFullDayHours(String(data.fullDayHours ?? 8));
      setHalfDayHours(String(data.halfDayHours ?? 4));
      setBelowHalfDay(data.belowHalfDay === "ABSENT" ? "ABSENT" : "HALF_DAY");
      flash("Working hours saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save working hours");
    } finally {
      setSavingHours(false);
    }
  };

  const persistCalendar = async (nextOffs: number[], nextHolidays: HrHoliday[], message: string) => {
    setSavingCalendar(true);
    setError("");
    try {
      const data = await hrApi.saveSettings({ weeklyOffs: nextOffs, holidays: nextHolidays });
      setWeeklyOffs(Array.isArray(data.weeklyOffs) ? data.weeklyOffs : nextOffs);
      setHolidays(Array.isArray(data.holidays) ? data.holidays : nextHolidays);
      flash(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save calendar");
    } finally {
      setSavingCalendar(false);
    }
  };

  const toggleWeeklyOff = (day: number) => {
    const next = weeklyOffs.includes(day)
      ? weeklyOffs.filter((item) => item !== day)
      : [...weeklyOffs, day].sort((a, b) => a - b);
    setWeeklyOffs(next);
    void persistCalendar(next, holidays, "Weekly offs saved.");
  };

  const addHoliday = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) {
      setError("Pick a holiday date");
      return;
    }
    if (!holidayName.trim()) {
      setError("Enter a holiday name");
      return;
    }
    if (holidays.some((row) => row.date === holidayDate)) {
      setError("That date is already a company holiday");
      return;
    }
    const next = [...holidays, { id: crypto.randomUUID(), date: holidayDate, name: holidayName.trim() }].sort(
      (a, b) => a.date.localeCompare(b.date)
    );
    setHolidayDate("");
    setHolidayName("");
    void persistCalendar(weeklyOffs, next, "Holiday added.");
  };

  const persistLeave = async (quota: string, types: HrLeaveType[], message: string) => {
    setSavingLeave(true);
    setError("");
    try {
      const data = await hrApi.saveSettings({
        leaveQuotaDays: Number(quota),
        leaveTypes: types,
      });
      setLeaveQuotaDays(String(data.leaveQuotaDays ?? quota));
      setLeaveTypes(Array.isArray(data.leaveTypes) ? data.leaveTypes : types);
      flash(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save leave policy");
    } finally {
      setSavingLeave(false);
    }
  };

  const addLeaveType = () => {
    const name = typeName.trim();
    if (!name) {
      setError("Enter a leave type name");
      return;
    }
    if (leaveTypes.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      setError("That leave type already exists");
      return;
    }
    const next = [...leaveTypes, { id: crypto.randomUUID(), name, days: Number(typeDays) || 0 }];
    const prevSum = typeDaysTotal(leaveTypes);
    const quota =
      Number(leaveQuotaDays) === prevSum || Number(leaveQuotaDays) === 12
        ? String(typeDaysTotal(next) || leaveQuotaDays)
        : leaveQuotaDays;
    setTypeName("");
    setTypeDays("6");
    setAddingType(false);
    void persistLeave(quota, next, "Leave type added.");
  };

  const searchMapPlace = async () => {
    const query = mapQuery.trim();
    if (!query) return;
    setMapSearching(true);
    setError("");
    try {
      const coords = await geocodeAddress(query);
      if (!coords) {
        setError("No place found. Try a fuller address.");
        return;
      }
      setDraft((prev) => ({
        ...prev,
        latitude: coords.lat.toFixed(6),
        longitude: coords.lon.toFixed(6),
      }));
    } catch {
      setError("Could not search the map right now.");
    } finally {
      setMapSearching(false);
    }
  };

  const useCurrentMapLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser cannot share location.");
      return;
    }
    setMapLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setMapLocating(false);
      },
      () => {
        setError("Allow location access to use current location.");
        setMapLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 8000 }
    );
  };

  const persistLocations = async (next: HrCheckInLocation[], message: string) => {
    setSavingLocations(true);
    setError("");
    try {
      const data = await hrApi.saveSettings({ locations: next });
      setLocations(Array.isArray(data.locations) ? data.locations : next);
      flash(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save locations");
    } finally {
      setSavingLocations(false);
    }
  };

  const addLocation = async () => {
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    const radiusMeters = Number(draft.radiusMeters || 200);
    if (!draft.name.trim()) {
      setError("Enter a location name");
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Enter latitude and longitude, or use this device location");
      return;
    }
    const next: HrCheckInLocation[] = [
      ...locations,
      {
        id: crypto.randomUUID(),
        storeId: draft.storeId || null,
        name: draft.name.trim(),
        address: draft.address.trim(),
        latitude,
        longitude,
        radiusMeters: Number.isFinite(radiusMeters) ? radiusMeters : 200,
      },
    ];
    setDraft(emptyDraft);
    await persistLocations(next, "Check-in location saved.");
  };

  const applyBranch = async (storeId: string) => {
    if (!storeId) {
      setDraft((prev) => ({ ...prev, storeId: "" }));
      return;
    }
    const store = branches.find((row) => row.id === storeId);
    if (!store) return;
    const address = storeAddress(store);
    setDraft((prev) => ({
      ...prev,
      storeId,
      name: store.name,
      address,
    }));
    setGeocoding(true);
    setError("");
    try {
      const queries = [
        address,
        [store.address, store.city].filter(Boolean).join(", "),
        [store.city, store.state, "India"].filter(Boolean).join(", "),
      ].filter((value, index, list) => value && list.indexOf(value) === index);
      let coords: { lat: number; lon: number } | null = null;
      for (const query of queries) {
        coords = await geocodeAddress(query);
        if (coords) break;
      }
      if (!coords) {
        setError("Branch selected. Click the map to set the exact pin.");
        return;
      }
      setDraft((prev) => ({
        ...prev,
        storeId,
        name: store.name,
        address,
        latitude: coords.lat.toFixed(6),
        longitude: coords.lon.toFixed(6),
      }));
    } catch {
      setError("Could not place this branch on the map. Click the map to set the pin.");
    } finally {
      setGeocoding(false);
    }
  };

  const removeLocation = async (id: string) => {
    await persistLocations(
      locations.filter((row) => row.id !== id),
      "Location removed."
    );
  };

  const fieldClass =
    "h-10 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574]";
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#8a7b68]";
  const cardClass =
    "rounded-2xl border border-[#eadfcf] bg-white p-4 shadow-[0_8px_24px_rgba(28,22,16,0.04)] dark:border-[#3a342c] dark:bg-[#161411] sm:p-5";
  const goldBtn =
    "inline-flex h-10 items-center justify-center rounded-xl !bg-[#c4a574] px-4 text-sm font-semibold !text-white hover:!bg-[#b3915f] disabled:opacity-60";
  const darkBtn =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl !bg-[#1c1610] px-4 text-sm font-semibold !text-white disabled:opacity-60";
  const ghostBtn =
    "inline-flex h-10 items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] disabled:opacity-60";

  const sectionHead = (
    title: string,
    subtitle: string,
    open: boolean,
    onToggle: () => void,
    icon: React.ReactNode,
    extra?: React.ReactNode
  ) => (
    <div className="flex items-start gap-3">
      <SectionIcon>{icon}</SectionIcon>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-[#1c1610] dark:text-[#f3ece2]">{title}</h2>
        <p className="mt-0.5 text-sm text-[#8a7b68]">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8a7b68]"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <HrPageHeader
        crumb="HR › Settings"
        title="Settings"
        subtitle="Configure working hours, weekly offs, holidays, leave quota and check-in locations"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">{saved}</p> : null}

      <section className={cardClass}>
        {sectionHead(
          "Working hours",
          "These rules mark Late, Full day, and Half day when employees check in and check out from the app.",
          openHours,
          () => setOpenHours((v) => !v),
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.5 1.5" />
          </svg>
        )}
        {openHours ? (
          loading ? (
            <p className="mt-5 text-sm text-[#8a7b68]">Loading hours…</p>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <label className="block">
                  <span className={labelClass}>Check-in</span>
                  <TimePickerField
                    id="hr-settings-check-in"
                    value={checkIn}
                    onChange={setCheckIn}
                    placeholder="Start time"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Check-out</span>
                  <TimePickerField
                    id="hr-settings-check-out"
                    value={checkOut}
                    onChange={setCheckOut}
                    placeholder="End time"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Late grace (minutes)</span>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Full day (hours)</span>
                  <input
                    className={fieldClass}
                    inputMode="decimal"
                    value={fullDayHours}
                    onChange={(e) => setFullDayHours(e.target.value)}
                    placeholder="8"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Half day (hours)</span>
                  <input
                    className={fieldClass}
                    inputMode="decimal"
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(e.target.value)}
                    placeholder="4"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Below half day</span>
                  <select
                    className={fieldClass}
                    value={belowHalfDay}
                    onChange={(e) => setBelowHalfDay(e.target.value === "ABSENT" ? "ABSENT" : "HALF_DAY")}
                  >
                    <option value="HALF_DAY">Mark as Half day</option>
                    <option value="ABSENT">Mark as Absent</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[#fbf8f3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-sm text-[#5c5146]">
                  <span className="mt-0.5 text-[#c4a574]">●</span>
                  Current window: <strong className="mx-1">{to12h(checkIn)} – {to12h(checkOut)}</strong>.
                  Full day from {fullDayHours || "8"}h, half day from {halfDayHours || "4"}h
                  {Number(graceMinutes) > 0 ? `, late after ${graceMinutes} min grace` : ""}.
                </p>
                <button
                  type="button"
                  onClick={() => void saveHours()}
                  disabled={savingHours || loading}
                  className={goldBtn}
                >
                  {savingHours ? "Saving…" : "Save hours"}
                </button>
              </div>
            </>
          )
        ) : null}
      </section>

      <section className={cardClass}>
        {sectionHead(
          "Weekly offs & holidays",
          "These days are skipped in working-day counts, LOP, and leave days. Employees can still check in if they work on an off day.",
          openCalendar,
          () => setOpenCalendar((v) => !v),
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M4 10h16M8 3v4M16 3v4" />
          </svg>
        )}
        {openCalendar ? (
          <div className="mt-5 space-y-4">
            <div>
              <p className={labelClass}>Weekly offs</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((row) => {
                  const on = weeklyOffs.includes(row.day);
                  return (
                    <button
                      key={row.day}
                      type="button"
                      disabled={loading || savingCalendar}
                      onClick={() => toggleWeeklyOff(row.day)}
                      className={`h-9 rounded-full px-4 text-sm font-semibold ${
                        on
                          ? "!bg-[#c4a574] !text-white"
                          : "border border-[#eadfcf] bg-white text-[#5c5146]"
                      }`}
                    >
                      {row.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className={labelClass}>Company holidays</p>
              <div className="flex flex-wrap items-center gap-2">
                {holidays.map((row) => (
                  <div
                    key={row.id}
                    className="inline-flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-2"
                  >
                    <span className="text-[#c4a574]">📅</span>
                    <span>
                      <span className="block text-sm font-semibold text-[#1c1610]">{row.name}</span>
                      <span className="text-xs text-[#8a7b68]">{row.date}</span>
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#c45c5c]"
                      onClick={() =>
                        void persistCalendar(
                          weeklyOffs,
                          holidays.filter((item) => item.id !== row.id),
                          "Holiday removed."
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <input
                  type="date"
                  className={`${fieldClass} max-w-[160px]`}
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                />
                <input
                  className={`${fieldClass} max-w-[200px]`}
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Holiday name"
                />
                <button type="button" onClick={addHoliday} disabled={savingCalendar} className={goldBtn}>
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className={cardClass}>
        {sectionHead(
          "Leave quota & types",
          "Employees pick from these types in the app. Pending and approved leave count toward the yearly quota.",
          openLeave,
          () => setOpenLeave((v) => !v),
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 4h8l4 4v12H7z" />
            <path d="M15 4v4h4M9 12h6M9 16h4" />
          </svg>,
          <button type="button" className={`${ghostBtn} !rounded-full`} onClick={() => setAddingType((v) => !v)}>
            <svg viewBox="0 0 24 24" className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Add Leave Type
          </button>
        )}
        {openLeave ? (
          <div className="mt-5 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="block w-full max-w-[160px] shrink-0">
                <span className={labelClass}>Annual quota (days)</span>
                <input
                  className={fieldClass}
                  inputMode="numeric"
                  value={leaveQuotaDays}
                  onChange={(e) => setLeaveQuotaDays(e.target.value)}
                  onBlur={() => void persistLeave(leaveQuotaDays, leaveTypes, "Leave quota saved.")}
                  placeholder={String(typeDaysTotal(leaveTypes) || 12)}
                />
              </label>
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {leaveTypes.map((row) => {
                  const look = leaveTypeLook(row.name);
                  return (
                    <div
                      key={row.id}
                      className={`flex min-h-[72px] items-center justify-between gap-4 rounded-[22px] px-4 py-3 ${look.wrap}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {look.icon}
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold leading-tight text-[#1c1610]">
                            {row.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-tight text-[#9a8b7c]">
                            {row.days > 0 ? `${row.days} days / year` : "No per-type cap"}
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-[13px] font-semibold text-[#ef4d4d]"
                        onClick={() => {
                          const next = leaveTypes.filter((item) => item.id !== row.id);
                          const prevSum = typeDaysTotal(leaveTypes);
                          const quota =
                            Number(leaveQuotaDays) === prevSum || Number(leaveQuotaDays) === 12
                              ? String(typeDaysTotal(next) || leaveQuotaDays)
                              : leaveQuotaDays;
                          void persistLeave(quota, next, "Leave type removed.");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {addingType ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${fieldClass} max-w-[220px]`}
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="Casual Leave"
                />
                <input
                  className={`${fieldClass} w-24`}
                  inputMode="numeric"
                  value={typeDays}
                  onChange={(e) => setTypeDays(e.target.value)}
                  placeholder="Days"
                />
                <button type="button" onClick={addLeaveType} disabled={savingLeave} className={goldBtn}>
                  Add
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={cardClass}>
        {sectionHead(
          "Check-in locations",
          "Employees can check in only inside these areas. Leave this empty to allow check-in from anywhere.",
          openLocations,
          () => setOpenLocations((v) => !v),
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.2" />
          </svg>
        )}
        {openLocations ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,34%)]">
            <div className="min-w-0 space-y-3">
              {locations.length ? (
                <ul className="flex flex-wrap gap-2">
                  {locations.map((row) => (
                    <li
                      key={row.id}
                      className="inline-flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] px-3 py-2"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-[#1c1610]">{row.name}</span>
                        <span className="text-xs text-[#8a7b68]">
                          {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)} · {row.radiusMeters} m
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={savingLocations}
                        onClick={() => void removeLocation(row.id)}
                        className="text-xs font-semibold text-[#c45c5c]"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_auto]">
                <label className="block min-w-0">
                  <span className={labelClass}>Branch</span>
                  <span className="relative block">
                    <select
                      className={`${fieldClass} appearance-none pr-9`}
                      value={draft.storeId}
                      disabled={geocoding || loading}
                      onChange={(event) => void applyBranch(event.target.value)}
                    >
                      <option value="">Select a branch</option>
                      {branches.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                          {store.city ? ` · ${store.city}` : ""}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7b68]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Search</span>
                  <input
                    className={fieldClass}
                    value={mapQuery}
                    onChange={(e) => setMapQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchMapPlace();
                      }
                    }}
                    placeholder="Search office, area, or city"
                  />
                </label>
                <div className="flex items-end">
                  <button type="button" className={ghostBtn} disabled={mapSearching} onClick={() => void searchMapPlace()}>
                    {mapSearching ? "…" : "Search"}
                  </button>
                </div>
                <div className="flex items-end">
                  <button type="button" className={darkBtn} disabled={mapLocating} onClick={useCurrentMapLocation}>
                    {mapLocating ? "Finding…" : "Current location"}
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_0.8fr_0.8fr_0.7fr_auto]">
                <label className="block min-w-0">
                  <span className={labelClass}>Name</span>
                  <input
                    className={fieldClass}
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Main Branch"
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Address</span>
                  <input
                    className={fieldClass}
                    value={draft.address}
                    onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Filled from the map, or type it"
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Latitude</span>
                  <input
                    className={fieldClass}
                    value={draft.latitude}
                    onChange={(e) => setDraft((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder="22.719600"
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Longitude</span>
                  <input
                    className={fieldClass}
                    value={draft.longitude}
                    onChange={(e) => setDraft((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder="75.857700"
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Radius (meters)</span>
                  <input
                    className={fieldClass}
                    value={draft.radiusMeters}
                    onChange={(e) => setDraft((prev) => ({ ...prev, radiusMeters: e.target.value }))}
                    placeholder="200"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void addLocation()}
                    disabled={savingLocations || loading}
                    className={goldBtn}
                  >
                    {savingLocations ? "Saving…" : "Add location"}
                  </button>
                </div>
              </div>
            </div>
            <HrCheckInMapPicker
              hideToolbar
              latitude={draft.latitude}
              longitude={draft.longitude}
              radiusMeters={draft.radiusMeters}
              mapClassName="h-[240px] w-full overflow-hidden rounded-2xl border border-[#eadfcf] lg:h-full lg:min-h-[240px]"
              onPick={(lat, lng, address) => {
                setDraft((prev) => ({
                  ...prev,
                  latitude: lat.toFixed(6),
                  longitude: lng.toFixed(6),
                  address: address || prev.address,
                }));
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
