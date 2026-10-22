"use client";

import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import TimePickerField from "@/components/hr/TimePickerField";
import AttendanceRecordingPlayer from "@/components/hr/AttendanceRecordingPlayer";
import AttendanceSessionsModal, {
  type DutySession,
  formatHms,
  sessionDurationSec,
} from "@/components/hr/AttendanceSessionsModal";
import { hrApi } from "@/services/crmApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Half Day"
  | "Leave"
  | "Holiday";

export type EmployeeLite = {
  id: string;
  name: string;
  store: string;
  department: string;
  employeeCode?: string;
  status: "Active" | "On Leave" | "Inactive";
};

type AttendanceRecord = {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  note: string;
  recordingId?: string;
  sessions: DutySession[];
};

type Props = {
  employees?: EmployeeLite[];
};

const attendanceColor: Record<
  AttendanceStatus,
  "success" | "error" | "warning" | "info" | "light"
> = {
  Present: "success",
  Absent: "error",
  "Half Day": "warning",
  Leave: "info",
  Holiday: "light",
};

const statuses: AttendanceStatus[] = [
  "Present",
  "Absent",
  "Half Day",
  "Leave",
  "Holiday",
];

const DEFAULT_CHECK_IN = "10:00";
const DEFAULT_CHECK_OUT = "19:00";

const selectClass =
  "h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const d = new Date(year, month - 1, day);
  const dd = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  return `${dd}-${mon}-${String(d.getFullYear()).slice(-2)}`;
}

function shiftIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function nowTime24() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function parseClock(value: string) {
  const raw = String(value || "").trim();
  if (!raw || raw === "—") return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    const mer = (match[4] || "").toUpperCase();
    if (mer === "PM" && hours < 12) hours += 12;
    if (mer === "AM" && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    return { hours, minutes, seconds };
  }
  if (/\d{4}-\d{2}-\d{2}|T/.test(raw)) {
    const iso = new Date(raw);
    if (!Number.isNaN(iso.getTime())) {
      return {
        hours: iso.getHours(),
        minutes: iso.getMinutes(),
        seconds: iso.getSeconds(),
      };
    }
  }
  return null;
}

function formatClock(parts: { hours: number; minutes: number; seconds: number }) {
  const hours = parts.hours % 12 || 12;
  const ampm = parts.hours >= 12 ? "PM" : "AM";
  if (parts.seconds) {
    return `${hours}:${pad2(parts.minutes)}:${pad2(parts.seconds)} ${ampm}`;
  }
  return `${hours}:${pad2(parts.minutes)} ${ampm}`;
}

function to24h(value: string) {
  const parts = parseClock(value);
  if (!parts) return "";
  return `${pad2(parts.hours)}:${pad2(parts.minutes)}`;
}

function to12h(value: string) {
  const parts = parseClock(value);
  if (!parts) return "—";
  return formatClock(parts);
}

function isLate(checkIn: string, officeStart: string) {
  const normalized = to24h(checkIn);
  const start = to24h(officeStart) || DEFAULT_CHECK_IN;
  if (!normalized) return false;
  return normalized > start;
}

function workHours(checkIn: string, checkOut: string) {
  return formatHms(sessionDurationSec(checkIn, checkOut, 0));
}

function clockLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parts = parseClock(raw);
  return parts ? formatClock(parts) : raw;
}

function sameClock(a: string, b: string) {
  return Boolean(to24h(a) && to24h(a) === to24h(b));
}

function mapSessions(row: Record<string, unknown>): DutySession[] {
  const punches = Array.isArray(row.punches)
    ? row.punches
        .map((item) => {
          const punch = item as { in?: string; out?: string; checkIn?: string; checkOut?: string };
          return {
            checkIn: clockLabel(punch.in || punch.checkIn || ""),
            checkOut: clockLabel(punch.out || punch.checkOut || ""),
          };
        })
        .filter((item) => item.checkIn)
    : [];
  const recordings = Array.isArray(row.recordings)
    ? [...row.recordings]
        .map((item) => item as Record<string, unknown>)
        .sort((a, b) => String(a.startedAt || "").localeCompare(String(b.startedAt || "")))
    : [];
  if (!punches.length && (row.checkIn || recordings.length)) {
    punches.push({
      checkIn: clockLabel(row.checkIn || recordings[0]?.checkInAt || recordings[0]?.startedAt || ""),
      checkOut: clockLabel(
        row.checkOut || recordings[recordings.length - 1]?.checkOutAt || recordings[recordings.length - 1]?.endedAt || ""
      ),
    });
  }
  const used = new Set<number>();
  const fromPunches: DutySession[] = punches.map((punch, index) => {
    let recIndex = recordings.findIndex(
      (item, i) => !used.has(i) && sameClock(String(item.checkInAt || ""), punch.checkIn)
    );
    if (recIndex < 0) recIndex = recordings.findIndex((_, i) => !used.has(i));
    const rec = recIndex >= 0 ? recordings[recIndex] : undefined;
    if (recIndex >= 0) used.add(recIndex);
    const durationSec = Number(rec?.durationSec || 0);
    return {
      index: index + 1,
      checkIn: punch.checkIn || clockLabel(rec?.checkInAt || rec?.startedAt || ""),
      checkOut: punch.checkOut || clockLabel(rec?.checkOutAt || rec?.endedAt || ""),
      durationSec,
      recordingId: rec?.id ? String(rec.id) : undefined,
      recordingStatus: rec?.status ? String(rec.status) : undefined,
      transcript: rec?.transcript ? String(rec.transcript) : "",
      transcriptStatus: rec?.transcriptStatus ? String(rec.transcriptStatus) : undefined,
      transcriptLanguage: rec?.transcriptLanguage ? String(rec.transcriptLanguage) : undefined,
      chunkCount: Number(rec?.chunkCount || 0),
    };
  });
  recordings.forEach((rec, i) => {
    if (used.has(i) || !rec?.id) return;
    fromPunches.push({
      index: fromPunches.length + 1,
      checkIn: clockLabel(rec.checkInAt || rec.startedAt || ""),
      checkOut: clockLabel(rec.checkOutAt || rec.endedAt || ""),
      durationSec: Number(rec.durationSec || 0),
      recordingId: String(rec.id),
      recordingStatus: rec.status ? String(rec.status) : undefined,
      transcript: rec.transcript ? String(rec.transcript) : "",
      transcriptStatus: rec.transcriptStatus ? String(rec.transcriptStatus) : undefined,
      transcriptLanguage: rec.transcriptLanguage ? String(rec.transcriptLanguage) : undefined,
      chunkCount: Number(rec.chunkCount || 0),
    });
  });
  return fromPunches;
}

function joinedTranscript(sessions: DutySession[]) {
  return sessions
    .map((row) => String(row.transcript || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function needsTranscriptPoll(sessions: DutySession[]) {
  return sessions.some(
    (row) =>
      row.chunkCount > 0 &&
      row.transcriptStatus !== "FAILED" &&
      (row.transcriptStatus === "PENDING" ||
        row.transcriptStatus === "PROCESSING" ||
        !row.transcriptStatus ||
        row.transcriptLanguage !== "latn")
  );
}

function recordKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

function apiDateKey(value: unknown) {
  const raw = String(value || "");
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return raw.slice(0, 10);
}

function mapApiStatus(status: unknown): AttendanceStatus {
  switch (String(status || "").toUpperCase()) {
    case "PRESENT":
    case "LATE":
      return "Present";
    case "HALF_DAY":
      return "Half Day";
    case "ON_LEAVE":
      return "Leave";
    case "HOLIDAY":
      return "Holiday";
    default:
      return "Absent";
  }
}

function toApiStatus(status: AttendanceStatus, checkIn: string, officeStart: string) {
  if (status === "Present") return isLate(checkIn, officeStart) ? "LATE" : "PRESENT";
  if (status === "Half Day") return "HALF_DAY";
  if (status === "Leave") return "ON_LEAVE";
  if (status === "Holiday") return "HOLIDAY";
  return "ABSENT";
}

function seedForDate(employees: EmployeeLite[], date: string): AttendanceRecord[] {
  return employees
    .filter((e) => e.status !== "Inactive")
    .map((e) => ({
      employeeId: e.id,
      date,
      checkIn: "",
      checkOut: "",
      status: (e.status === "On Leave" ? "Leave" : "Absent") as AttendanceStatus,
      note: "",
      sessions: [],
    }));
}

export default function AttendanceManager({ employees = [] }: Props) {
  const [date, setDate] = useState(todayIso());
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All" | AttendanceStatus | "Late">(
    "All"
  );
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [baseline, setBaseline] = useState<Record<string, AttendanceRecord>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>("Present");
  const [savedFlash, setSavedFlash] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onYes: () => void;
  } | null>(null);
  const [pickerNonce, setPickerNonce] = useState(0);
  const [officeStart, setOfficeStart] = useState(DEFAULT_CHECK_IN);
  const [officeEnd, setOfficeEnd] = useState(DEFAULT_CHECK_OUT);
  const [listening, setListening] = useState<{ id: string; name: string } | null>(null);
  const [sessionView, setSessionView] = useState<{
    emp: EmployeeLite;
    dateLabel: string;
    status: string;
    sessions: DutySession[];
  } | null>(null);

  const askConfirm = (title: string, message: string, onYes: () => void) => {
    setConfirm({ title, message, onYes });
  };

  const closeConfirm = (restorePicker = false) => {
    setConfirm(null);
    if (restorePicker) setPickerNonce((n) => n + 1);
  };

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== "Inactive"),
    [employees]
  );

  const storeOptions = useMemo(() => {
    const set = new Set(activeEmployees.map((e) => e.store));
    return ["All Stores", ...Array.from(set)];
  }, [activeEmployees]);

  useEffect(() => {
    let cancelled = false;
    hrApi
      .getSettings()
      .then((data) => {
        if (cancelled) return;
        setOfficeStart(to24h(String(data?.checkIn || "")) || DEFAULT_CHECK_IN);
        setOfficeEnd(to24h(String(data?.checkOut || "")) || DEFAULT_CHECK_OUT);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDay() {
      if (activeEmployees.length === 0) return;
      setLoadingDay(true);
      setLoadError("");
      try {
        const data = await hrApi.listAttendance({ date, limit: 100 });
        if (cancelled) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setRecords((prev) => {
          const next = { ...prev };
          const byEmployee = new Map<string, AttendanceRecord>();
          items.forEach((row) => {
            const employee = row.employee as { id?: string } | undefined;
            const employeeId = String(row.employeeId || employee?.id || "");
            if (!employeeId) return;
            const rowDate = apiDateKey(row.date) || date;
            const sessions = mapSessions(row);
            const rec = sessions.find((item) => item.recordingId);
            byEmployee.set(employeeId, {
              employeeId,
              date: rowDate,
              checkIn: clockLabel(row.checkIn || sessions[0]?.checkIn || ""),
              checkOut: clockLabel(
                row.checkOut || sessions.filter((item) => item.checkOut).at(-1)?.checkOut || ""
              ),
              status: mapApiStatus(row.status),
              note: String(row.remark || ""),
              recordingId: rec?.recordingId,
              sessions,
            });
          });
          const snap: Record<string, AttendanceRecord> = {};
          activeEmployees.forEach((emp) => {
            const key = recordKey(emp.id, date);
            const fetched = byEmployee.get(emp.id);
            const row: AttendanceRecord = fetched
              ? { ...fetched, date }
              : {
                  employeeId: emp.id,
                  date,
                  checkIn: "",
                  checkOut: "",
                  status: (emp.status === "On Leave" ? "Leave" : "Absent") as AttendanceStatus,
                  note: "",
                  sessions: [],
                };
            next[key] = row;
            snap[key] = { ...row };
          });
          setBaseline((prev) => ({ ...prev, ...snap }));
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load attendance");
        }
      } finally {
        if (!cancelled) setLoadingDay(false);
      }
    }
    loadDay();
    return () => {
      cancelled = true;
    };
  }, [date, activeEmployees]);

  const waitingOnText = useMemo(
    () => Object.values(records).some((row) => needsTranscriptPoll(row.sessions || [])),
    [records]
  );

  useEffect(() => {
    if (!waitingOnText) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const data = await hrApi.listAttendance({ date, limit: 100 });
        if (cancelled) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setRecords((prev) => {
          const next = { ...prev };
          items.forEach((row) => {
            const employee = row.employee as { id?: string } | undefined;
            const employeeId = String(row.employeeId || employee?.id || "");
            if (!employeeId) return;
            const key = recordKey(employeeId, date);
            const existing = next[key];
            if (!existing) return;
            next[key] = { ...existing, sessions: mapSessions(row) };
          });
          return next;
        });
      } catch {
        /* keep last known text */
      }
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [date, waitingOnText]);

  useEffect(() => {
    setSessionView((prev) => {
      if (!prev) return prev;
      const rec = records[recordKey(prev.emp.id, date)];
      if (!rec) return prev;
      return { ...prev, sessions: rec.sessions, status: rec.status };
    });
  }, [records, date]);

  const dayRows = useMemo(() => {
    return activeEmployees.map((emp) => {
      const key = recordKey(emp.id, date);
      const existing = records[key];
      const fallback: AttendanceRecord = {
        employeeId: emp.id,
        date,
        checkIn: "",
        checkOut: "",
        status: (emp.status === "On Leave" ? "Leave" : "Absent") as AttendanceStatus,
        note: "",
        sessions: [],
      };
      return { emp, record: existing || fallback, key };
    });
  }, [activeEmployees, date, records]);

  const scopedRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return dayRows.filter(({ emp }) => {
      const haystack = [
        emp.name,
        emp.id,
        emp.department,
        emp.store,
        emp.employeeCode || "",
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchStore =
        storeFilter === "All Stores" ||
        (emp.store || "Main Branch") === storeFilter;
      return matchSearch && matchStore;
    });
  }, [dayRows, search, storeFilter]);

  const filteredRows = useMemo(() => {
    return scopedRows.filter(({ record }) => {
      const late =
        (record.status === "Present" || record.status === "Half Day") &&
        isLate(record.checkIn, officeStart);
      if (statusFilter === "All") return true;
      if (statusFilter === "Late") return late;
      return record.status === statusFilter;
    });
  }, [scopedRows, statusFilter, officeStart]);

  const summary = useMemo(() => {
    const base = {
      Present: 0,
      Absent: 0,
      "Half Day": 0,
      Leave: 0,
      Holiday: 0,
      Late: 0,
    };
    scopedRows.forEach(({ record }) => {
      base[record.status] += 1;
      if (
        (record.status === "Present" || record.status === "Half Day") &&
        isLate(record.checkIn, officeStart)
      ) {
        base.Late += 1;
      }
    });
    return base;
  }, [scopedRows, officeStart]);

  const ensureRecord = (employeeId: string): AttendanceRecord => {
    const key = recordKey(employeeId, date);
    if (records[key]) return records[key];
    const emp = activeEmployees.find((e) => e.id === employeeId);
    return {
      employeeId,
      date,
      checkIn: "",
      checkOut: "",
      status: (emp?.status === "On Leave" ? "Leave" : "Absent") as AttendanceStatus,
      note: "",
      sessions: [],
    };
  };

  const patchRecord = (
    employeeId: string,
    patch: Partial<AttendanceRecord>
  ) => {
    const key = recordKey(employeeId, date);
    const current = ensureRecord(employeeId);
    setRecords((prev) => ({
      ...prev,
      [key]: { ...current, ...patch, employeeId, date },
    }));
  };

  const persistRecord = async (employeeId: string, next: AttendanceRecord) => {
    const key = recordKey(employeeId, date);
    setRecords((prev) => ({ ...prev, [key]: next }));
    setSavingDay(true);
    setLoadError("");
    try {
      const saved = await hrApi.upsertAttendance({
        employeeId,
        date,
        status: toApiStatus(next.status, next.checkIn, officeStart),
        checkIn: next.checkIn || null,
        checkOut: next.checkOut || null,
        remark: next.note || null,
      });
      if (saved && String(saved.status || "").toUpperCase() === "ON_LEAVE") {
        setRecords((prev) => ({
          ...prev,
          [key]: {
            ...next,
            status: "Leave",
            checkIn: "",
            checkOut: "",
            note: String(saved.remark || next.note || "Leave"),
          },
        }));
      }
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSavingDay(false);
    }
  };

  const applyAndSave = (employeeId: string, patch: Partial<AttendanceRecord>) => {
    const current = ensureRecord(employeeId);
    void persistRecord(employeeId, { ...current, ...patch, employeeId, date });
  };

  const markStatus = (employeeId: string, status: AttendanceStatus) => {
    const patch: Partial<AttendanceRecord> = { status };
    if (status === "Present" || status === "Half Day") {
      const current = ensureRecord(employeeId);
      if (!current.checkIn) patch.checkIn = nowTime24();
    }
    if (status === "Absent" || status === "Leave" || status === "Holiday") {
      patch.checkIn = "";
      patch.checkOut = "";
    }
    patchRecord(employeeId, patch);
  };

  const checkIn = (employeeId: string) => {
    const emp = activeEmployees.find((e) => e.id === employeeId);
    const time = nowTime24();
    askConfirm(
      "Confirm check in",
      `Check in ${emp?.name || "this employee"} at ${to12h(time)}?`,
      () => {
        applyAndSave(employeeId, {
          checkIn: time,
          status: "Present",
        });
      }
    );
  };

  const checkOut = (employeeId: string) => {
    const current = ensureRecord(employeeId);
    const emp = activeEmployees.find((e) => e.id === employeeId);
    const time = nowTime24();
    askConfirm(
      "Confirm check out",
      `Check out ${emp?.name || "this employee"} at ${to12h(time)}?`,
      () => {
        applyAndSave(employeeId, {
          checkOut: time,
          status:
            current.status === "Absent" || current.status === "Leave"
              ? "Present"
              : current.status,
        });
      }
    );
  };

  const resetTimes = (employeeId: string) => {
    const key = recordKey(employeeId, date);
    const previous = baseline[key];
    const emp = activeEmployees.find((e) => e.id === employeeId);
    askConfirm(
      "Reset check in / check out",
      previous?.checkIn
        ? `Restore previous times for ${emp?.name || "this employee"} (${to12h(previous.checkIn)}${previous.checkOut ? ` – ${to12h(previous.checkOut)}` : ""})?`
        : `Clear check in and check out for ${emp?.name || "this employee"}?`,
      () => {
        if (previous) {
          void persistRecord(employeeId, { ...previous, employeeId, date });
          return;
        }
        applyAndSave(employeeId, { checkIn: "", checkOut: "", status: "Absent" });
      }
    );
  };

  const markAllPresent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      filteredRows.forEach(({ emp }) => {
        const key = recordKey(emp.id, date);
        const current = next[key] || ensureRecord(emp.id);
        if (current.status === "Leave") return;
        next[key] = {
          ...current,
          status: "Present",
          checkIn: current.checkIn || officeStart,
          employeeId: emp.id,
          date,
        };
      });
      return next;
    });
  };

  const markAllAbsent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      filteredRows.forEach(({ emp }) => {
        const key = recordKey(emp.id, date);
        const current = next[key] || ensureRecord(emp.id);
        if (current.status === "Leave") return;
        next[key] = {
          employeeId: emp.id,
          date,
          checkIn: "",
          checkOut: "",
          status: "Absent",
          note: current.note || "",
        };
      });
      return next;
    });
  };

  const applyBulkToSelected = () => {
    if (selected.length === 0) return;
    selected.forEach((id) => markStatus(id, bulkStatus));
    setSelected([]);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every(({ emp }) => selected.includes(emp.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) =>
        prev.filter((id) => !filteredRows.some(({ emp }) => emp.id === id))
      );
    } else {
      setSelected((prev) => [
        ...new Set([...prev, ...filteredRows.map(({ emp }) => emp.id)]),
      ]);
    }
  };

  const initDayIfEmpty = () => {
    const seeded = seedForDate(activeEmployees, date);
    setRecords((prev) => {
      const next = { ...prev };
      seeded.forEach((r) => {
        const key = recordKey(r.employeeId, r.date);
        if (!next[key]) next[key] = r;
      });
      return next;
    });
  };

  const saveDay = async () => {
    initDayIfEmpty();
    setSavingDay(true);
    setLoadError("");
    try {
      await Promise.all(
        dayRows.map(({ emp, record }) =>
          hrApi.upsertAttendance({
            employeeId: emp.id,
            date,
            status: toApiStatus(record.status, record.checkIn, officeStart),
            checkIn: record.checkIn || null,
            checkOut: record.checkOut || null,
            remark: record.note || null,
          })
        )
      );
      setBaseline((prev) => {
        const next = { ...prev };
        dayRows.forEach(({ emp, record }) => {
          next[recordKey(emp.id, date)] = { ...record, employeeId: emp.id, date };
        });
        return next;
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSavingDay(false);
    }
  };

  const shiftDate = (days: number) => {
    setDate(shiftIso(date, days));
    setSelected([]);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["Present", summary.Present],
            ["Absent", summary.Absent],
            ["Half Day", summary["Half Day"]],
            ["Leave", summary.Leave],
            ["Holiday", summary.Holiday],
            ["Late", summary.Late],
          ] as const
        ).map(([label, value]) => {
          const active = statusFilter === label;
          return (
            <button
              type="button"
              key={label}
              onClick={() => setStatusFilter(active ? "All" : label)}
              className={`rounded-2xl border px-4 py-3 text-left ${
                active
                  ? "border-[#c4a574] bg-[#f6efe4]"
                  : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
              }`}
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
                {value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-400">Date</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="inline-flex h-11 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700"
                  aria-label="Previous day"
                >
                  ‹
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelected([]);
                  }}
                  className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="inline-flex h-11 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700"
                  aria-label="Next day"
                >
                  ›
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDate(todayIso());
                    setSelected([]);
                  }}
                >
                  Today
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-400">
                Search
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, ID, dept, store…"
                className="h-11 w-44 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-400">Store</p>
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {storeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-medium text-gray-400">
                Status
              </p>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "All" | AttendanceStatus | "Late")
                }
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="Late">Late</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={markAllPresent}>
              Mark All Present
            </Button>
            <Button size="sm" variant="outline" onClick={markAllAbsent}>
              Mark All Absent
            </Button>
            <Button size="sm" onClick={() => void saveDay()} disabled={savingDay || loadingDay}>
              {savingDay ? "Saving…" : savedFlash ? "Saved ✓" : "Save Day"}
            </Button>
          </div>
        </div>
        {loadingDay ? (
          <p className="mt-2 text-xs text-gray-500">Loading check-in and check-out from HR…</p>
        ) : null}
        {loadError ? <p className="mt-2 text-xs text-error-600">{loadError}</p> : null}

        {/* Bulk selected */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <span className="text-xs text-gray-500">
            {formatDisplayDate(date)} · {filteredRows.length} staff ·{" "}
            {selected.length} selected
          </span>
          <select
            value={bulkStatus}
            onChange={(e) =>
              setBulkStatus(e.target.value as AttendanceStatus)
            }
            className={selectClass}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={applyBulkToSelected}
            disabled={selected.length === 0}
          >
            Apply to Selected
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1400px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="w-12 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </TableCell>
                  {[
                    "Employee",
                    "Store",
                    "Status",
                    "Check In",
                    "Check Out",
                    "Hours",
                    "Sessions",
                    "Duty text",
                    "Note",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-3 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredRows.map(({ emp, record }) => {
                  const late =
                    (record.status === "Present" ||
                      record.status === "Half Day") &&
                    isLate(record.checkIn, officeStart);
                  return (
                    <TableRow
                      key={emp.id}
                      className={
                        late
                          ? "bg-warning-50/50 dark:bg-warning-500/5"
                          : undefined
                      }
                    >
                      <TableCell className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(emp.id)}
                          onChange={() => toggleSelect(emp.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${emp.name}`}
                        />
                      </TableCell>

                      <TableCell className="px-3 py-3 text-start whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {emp.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {emp.employeeCode || emp.id} · {emp.department}
                        </p>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {emp.store}
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={record.status}
                            onChange={(e) =>
                              markStatus(
                                emp.id,
                                e.target.value as AttendanceStatus
                              )
                            }
                            className={selectClass}
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <Badge size="sm" color={attendanceColor[record.status]}>
                            {record.status}
                          </Badge>
                          {late && (
                            <span className="text-[11px] font-medium text-warning-600">
                              Late
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <TimePickerField
                            id={`checkin-${emp.id}-${date}-${pickerNonce}`}
                            value={record.checkIn}
                            placeholder="Check in"
                            onChange={(time) => {
                              if (!time || time === record.checkIn) return;
                              askConfirm(
                                "Confirm check in",
                                `Set check in for ${emp.name} to ${to12h(time)}?`,
                                () =>
                                  applyAndSave(emp.id, {
                                    checkIn: time,
                                    status:
                                      record.status === "Absent" ||
                                      record.status === "Leave" ||
                                      record.status === "Holiday"
                                        ? "Present"
                                        : record.status,
                                  })
                              );
                            }}
                          />
                          <span className="text-[11px] text-gray-400">
                            {to12h(record.checkIn)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <TimePickerField
                            id={`checkout-${emp.id}-${date}-${pickerNonce}`}
                            value={record.checkOut}
                            placeholder="Check out"
                            onChange={(time) => {
                              if (!time || time === record.checkOut) return;
                              askConfirm(
                                "Confirm check out",
                                `Set check out for ${emp.name} to ${to12h(time)}?`,
                                () => applyAndSave(emp.id, { checkOut: time })
                              );
                            }}
                          />
                          <span className="text-[11px] text-gray-400">
                            {to12h(record.checkOut)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatHms(
                          (record.sessions || []).reduce(
                            (sum, row) => sum + sessionDurationSec(row.checkIn, row.checkOut, row.durationSec || 0),
                            0
                          ) || sessionDurationSec(record.checkIn, record.checkOut, 0)
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-3 whitespace-nowrap">
                        {(record.sessions || []).length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSessionView({
                                emp,
                                dateLabel: formatDisplayDate(date),
                                status: record.status,
                                sessions: record.sessions,
                              })
                            }
                            className="inline-flex h-9 items-center rounded-lg bg-[#8C6239] px-3 text-sm font-medium text-white hover:bg-[#5C3D2E]"
                          >
                            View {(record.sessions || []).length} session
                            {(record.sessions || []).length === 1 ? "" : "s"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No sessions</span>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        {joinedTranscript(record.sessions || []) ? (
                          <div className="max-h-28 max-w-[280px] overflow-y-auto pr-1">
                            <p className="whitespace-pre-wrap text-xs leading-5 text-gray-700 dark:text-gray-300">
                              {joinedTranscript(record.sessions || [])}
                            </p>
                          </div>
                        ) : needsTranscriptPoll(record.sessions || []) ? (
                          <span className="text-xs text-gray-400">Converting…</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <input
                          type="text"
                          value={record.note}
                          onChange={(e) =>
                            patchRecord(emp.id, { note: e.target.value })
                          }
                          placeholder="Add note…"
                          className="h-9 w-40 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        />
                      </TableCell>

                      <TableCell className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => checkIn(emp.id)}
                            disabled={record.status === "Leave"}
                            className="text-sm font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40"
                          >
                            Check In
                          </button>
                          <button
                            type="button"
                            onClick={() => checkOut(emp.id)}
                            disabled={!record.checkIn || record.status === "Leave"}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 dark:text-gray-400"
                          >
                            Check Out
                          </button>
                          <button
                            type="button"
                            onClick={() => resetTimes(emp.id)}
                            className="text-sm font-medium text-[#8C6239] hover:text-[#5C3D2E]"
                          >
                            Reset
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                      No employees match this date / filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Office hours {to12h(officeStart)} – {to12h(officeEnd)} · check-ins after
        start are marked Late · click a summary card or Status to filter · Reset
        restores the last saved check in / check out
      </p>

      {sessionView ? (
        <AttendanceSessionsModal
          employee={sessionView.emp}
          dateLabel={sessionView.dateLabel}
          status={sessionView.status}
          sessions={sessionView.sessions}
          onListen={(id, label) =>
            setListening({ id, name: `${sessionView.emp.name} · ${label}` })
          }
          onClose={() => setSessionView(null)}
        />
      ) : null}

      {listening ? (
        <AttendanceRecordingPlayer
          recordingId={listening.id}
          employeeName={listening.name}
          onClose={() => setListening(null)}
        />
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1c1814]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{confirm.title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{confirm.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => closeConfirm(true)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const action = confirm.onYes;
                  closeConfirm(false);
                  action();
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
