"use client";

import React, { useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import TimePickerField from "@/components/hr/TimePickerField";
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
  status: "Active" | "On Leave" | "Inactive";
};

type AttendanceRecord = {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  note: string;
};

type Props = {
  employees: EmployeeLite[];
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

const OFFICE_START = "10:00";

const selectClass =
  "h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

function nowTime24() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function to12h(time24: string) {
  if (!time24 || time24 === "—") return "—";
  const [hStr, mStr] = time24.split(":");
  let h = Number(hStr);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function isLate(checkIn: string) {
  if (!checkIn || checkIn === "—") return false;
  return checkIn > OFFICE_START;
}

function workHours(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut || checkIn === "—" || checkOut === "—") return "—";
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function recordKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
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
    }));
}

export default function AttendanceManager({ employees }: Props) {
  const [date, setDate] = useState(todayIso());
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [statusFilter, setStatusFilter] = useState<"All" | AttendanceStatus>(
    "All"
  );
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>("Present");
  const [savedFlash, setSavedFlash] = useState(false);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== "Inactive"),
    [employees]
  );

  const storeOptions = useMemo(() => {
    const set = new Set(activeEmployees.map((e) => e.store));
    return ["All Stores", ...Array.from(set)];
  }, [activeEmployees]);

  const dayRows = useMemo(() => {
    return activeEmployees.map((emp) => {
      const key = recordKey(emp.id, date);
      const existing = records[key];
      const fallback: AttendanceRecord = {
        employeeId: emp.id,
        date,
        checkIn: "",
        checkOut: "",
        status: emp.status === "On Leave" ? "Leave" : "Absent",
        note: "",
      };
      return { emp, record: existing || fallback, key };
    });
  }, [activeEmployees, date, records]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return dayRows.filter(({ emp, record }) => {
      const matchSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q);
      const matchStore =
        storeFilter === "All Stores" || emp.store === storeFilter;
      const matchStatus =
        statusFilter === "All" || record.status === statusFilter;
      return matchSearch && matchStore && matchStatus;
    });
  }, [dayRows, search, storeFilter, statusFilter]);

  const summary = useMemo(() => {
    const base = {
      Present: 0,
      Absent: 0,
      "Half Day": 0,
      Leave: 0,
      Holiday: 0,
      Late: 0,
    };
    dayRows.forEach(({ record }) => {
      base[record.status] += 1;
      if (
        (record.status === "Present" || record.status === "Half Day") &&
        isLate(record.checkIn)
      ) {
        base.Late += 1;
      }
    });
    return base;
  }, [dayRows]);

  const ensureRecord = (employeeId: string): AttendanceRecord => {
    const key = recordKey(employeeId, date);
    if (records[key]) return records[key];
    const emp = activeEmployees.find((e) => e.id === employeeId);
    return {
      employeeId,
      date,
      checkIn: "",
      checkOut: "",
      status: emp?.status === "On Leave" ? "Leave" : "Absent",
      note: "",
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
    patchRecord(employeeId, {
      checkIn: nowTime24(),
      status: "Present",
    });
  };

  const checkOut = (employeeId: string) => {
    const current = ensureRecord(employeeId);
    patchRecord(employeeId, {
      checkOut: nowTime24(),
      status:
        current.status === "Absent" || current.status === "Leave"
          ? "Present"
          : current.status,
    });
  };

  const markAllPresent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      filteredRows.forEach(({ emp }) => {
        const key = recordKey(emp.id, date);
        const current = next[key] || ensureRecord(emp.id);
        next[key] = {
          ...current,
          status: "Present",
          checkIn: current.checkIn || OFFICE_START,
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
        next[key] = {
          employeeId: emp.id,
          date,
          checkIn: "",
          checkOut: "",
          status: "Absent",
          note: next[key]?.note || "",
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

  const saveDay = () => {
    initDayIfEmpty();
    // Force persist visible rows
    setRecords((prev) => {
      const next = { ...prev };
      dayRows.forEach(({ emp, record }) => {
        next[recordKey(emp.id, date)] = { ...record, employeeId: emp.id, date };
      });
      return next;
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
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
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
              {value}
            </p>
          </div>
        ))}
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
                placeholder="Name, ID, dept…"
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
                  setStatusFilter(e.target.value as "All" | AttendanceStatus)
                }
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
            <Button size="sm" onClick={saveDay}>
              {savedFlash ? "Saved ✓" : "Save Day"}
            </Button>
          </div>
        </div>

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
          <div className="min-w-[1100px]">
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
                    isLate(record.checkIn);
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
                          {emp.id} · {emp.department}
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
                            id={`checkin-${emp.id}-${date}`}
                            value={record.checkIn}
                            placeholder="Check in"
                            onChange={(time) =>
                              patchRecord(emp.id, {
                                checkIn: time,
                                status:
                                  time &&
                                  (record.status === "Absent" ||
                                    record.status === "Leave" ||
                                    record.status === "Holiday")
                                    ? "Present"
                                    : record.status,
                              })
                            }
                          />
                          <span className="text-[11px] text-gray-400">
                            {to12h(record.checkIn)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <TimePickerField
                            id={`checkout-${emp.id}-${date}`}
                            value={record.checkOut}
                            placeholder="Check out"
                            onChange={(time) =>
                              patchRecord(emp.id, {
                                checkOut: time,
                              })
                            }
                          />
                          <span className="text-[11px] text-gray-400">
                            {to12h(record.checkOut)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {workHours(record.checkIn, record.checkOut)}
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
                            className="text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Check In
                          </button>
                          <button
                            type="button"
                            onClick={() => checkOut(emp.id)}
                            disabled={!record.checkIn}
                            className="text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 dark:text-gray-400"
                          >
                            Check Out
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
        Office start {OFFICE_START} · check-ins after that are marked Late ·
        attendance is stored per date in this session
      </p>
    </div>
  );
}
