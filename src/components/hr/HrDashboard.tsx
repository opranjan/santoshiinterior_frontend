"use client";

import React, { useEffect, useMemo, useState } from "react";
import { hrApi, storesApi } from "@/services/crmApi";
import { labelToEnum } from "@/lib/mappers";
import { mapEmployee, mapLeave, toIsoDateOrNull } from "@/lib/crmMappers";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import AttendanceManager from "@/components/hr/AttendanceManager";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Department =
  | "Sales"
  | "Design"
  | "Site"
  | "Accounts"
  | "HR"
  | "Admin";

type EmpStatus = "Active" | "On Leave" | "Inactive";
type LeaveStatus = "Pending" | "Approved" | "Rejected";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: Department;
  role: string;
  store: string;
  joinDate: string;
  status: EmpStatus;
};

type LeaveRequest = {
  id: string;
  employeeId: string;
  name: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
};

type Tab = "employees" | "attendance" | "leaves";

const departments: Array<"All" | Department> = [
  "All",
  "Sales",
  "Design",
  "Site",
  "Accounts",
  "HR",
  "Admin",
];

const stores = ["All Stores", "Main Branch", "North Store", "South Store"];

const initialEmployees: Employee[] = [
  {
    id: "EMP-101",
    name: "Mukesh singh",
    email: "mukesh@santoshiinterior.com",
    phone: "+91 90963 32191",
    department: "Admin",
    role: "Director",
    store: "Main Branch",
    joinDate: "2020-04-01",
    status: "Active",
  },
  {
    id: "EMP-102",
    name: "Rahul Sharma",
    email: "rahul@santoshiinterior.com",
    phone: "+91 98765 43210",
    department: "Sales",
    role: "Sales Manager",
    store: "Main Branch",
    joinDate: "2022-06-15",
    status: "Active",
  },
  {
    id: "EMP-103",
    name: "Priya Mehta",
    email: "priya@santoshiinterior.com",
    phone: "+91 98111 22334",
    department: "Sales",
    role: "Sales Executive",
    store: "North Store",
    joinDate: "2023-01-10",
    status: "Active",
  },
  {
    id: "EMP-104",
    name: "Amit Verma",
    email: "amit@santoshiinterior.com",
    phone: "+91 99887 66554",
    department: "Sales",
    role: "Sales Executive",
    store: "South Store",
    joinDate: "2023-08-21",
    status: "On Leave",
  },
  {
    id: "EMP-105",
    name: "Sneha Patel",
    email: "sneha@santoshiinterior.com",
    phone: "+91 97654 32109",
    department: "Design",
    role: "Interior Designer",
    store: "Main Branch",
    joinDate: "2024-02-05",
    status: "Active",
  },
  {
    id: "EMP-106",
    name: "Vikram Singh",
    email: "vikram@santoshiinterior.com",
    phone: "+91 96543 21098",
    department: "Site",
    role: "Site Supervisor",
    store: "North Store",
    joinDate: "2021-11-18",
    status: "Active",
  },
  {
    id: "EMP-107",
    name: "Neha Gupta",
    email: "neha@santoshiinterior.com",
    phone: "+91 95432 10987",
    department: "Accounts",
    role: "Accountant",
    store: "Main Branch",
    joinDate: "2022-09-01",
    status: "Active",
  },
  {
    id: "EMP-108",
    name: "Riya Kapoor",
    email: "riya@santoshiinterior.com",
    phone: "+91 94321 09876",
    department: "HR",
    role: "HR Executive",
    store: "Main Branch",
    joinDate: "2024-05-12",
    status: "Active",
  },
];

const initialLeaves: LeaveRequest[] = [
  {
    id: "LV-201",
    employeeId: "EMP-104",
    name: "Amit Verma",
    type: "Casual Leave",
    from: "2026-07-30",
    to: "2026-07-31",
    days: 2,
    reason: "Family function",
    status: "Approved",
  },
  {
    id: "LV-202",
    employeeId: "EMP-105",
    name: "Sneha Patel",
    type: "Sick Leave",
    from: "2026-08-02",
    to: "2026-08-02",
    days: 1,
    reason: "Not feeling well",
    status: "Pending",
  },
  {
    id: "LV-203",
    employeeId: "EMP-106",
    name: "Vikram Singh",
    type: "Casual Leave",
    from: "2026-08-05",
    to: "2026-08-06",
    days: 2,
    reason: "Personal work",
    status: "Pending",
  },
];

const empStatusColor: Record<EmpStatus, "success" | "warning" | "light"> = {
  Active: "success",
  "On Leave": "warning",
  Inactive: "light",
};

const leaveColor: Record<LeaveStatus, "warning" | "success" | "error"> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${year}`;
}

const selectClass =
  "h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function HrDashboard() {
  const [tab, setTab] = useState<Tab>("employees");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<"All" | Department>("All");
  const [storeFilter, setStoreFilter] = useState("All Stores");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState<Department>("Sales");
  const [newRole, setNewRole] = useState("");
  const [newStore, setNewStore] = useState("Main Branch");
  const [staff, setStaff] = useState<Employee[]>([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [emps, leaveData, stores] = await Promise.all([
          hrApi.listEmployees({ limit: 100 }),
          hrApi.listLeaves({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setStaff(
          emps.items.map((i) => mapEmployee(i as Record<string, unknown>) as Employee)
        );
        setLeaves(
          leaveData.items.map((i) => mapLeave(i as Record<string, unknown>) as LeaveRequest)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load HR data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase().trim();
    return staff.filter((e) => {
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q);
      const matchDept = deptFilter === "All" || e.department === deptFilter;
      const matchStore =
        storeFilter === "All Stores" || e.store === storeFilter;
      return matchSearch && matchDept && matchStore;
    });
  }, [staff, search, deptFilter, storeFilter]);

  const stats = useMemo(() => {
    const active = staff.filter((e) => e.status === "Active").length;
    const onLeave = staff.filter((e) => e.status === "On Leave").length;
    const pendingLeaves = leaves.filter((l) => l.status === "Pending").length;
    return {
      total: staff.length,
      active,
      onLeave,
      present: active,
      pendingLeaves,
    };
  }, [staff, leaves]);

  const attendanceEmployees = useMemo(
    () =>
      staff.map((e) => ({
        id: e.id,
        name: e.name,
        store: e.store,
        department: e.department,
        status: e.status,
      })),
    [staff]
  );

  const setLeaveStatus = (id: string, status: LeaveStatus) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  };

  const addEmployee = async () => {
    if (!newName.trim() || !newEmail.trim() || !newRole.trim()) return;
    const storeId =
      storeOptions.find((s) => s.name === newStore)?.id || null;
    try {
      const created = (await hrApi.createEmployee({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: null,
        department: labelToEnum(newDept),
        roleTitle: newRole.trim(),
        storeId,
        joinDate: new Date().toISOString(),
        status: "ACTIVE",
      })) as Record<string, unknown>;
      setStaff((prev) => [mapEmployee(created) as Employee, ...prev]);
      setNewName("");
      setNewEmail("");
      setNewRole("");
      setNewDept("Sales");
      setNewStore(storeOptions[0]?.name || "Main Branch");
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "employees", label: "Employees" },
    { id: "attendance", label: "Attendance" },
    { id: "leaves", label: "Leave Requests" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Human Resources
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Employees, daily attendance, and leave across stores.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total Staff", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "On Leave", value: stats.onLeave },
          { label: "Active Today", value: stats.present },
          { label: "Pending Leaves", value: stats.pendingLeaves },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-brand-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300"
            }`}
          >
            {t.label}
            {t.id === "leaves" && stats.pendingLeaves > 0
              ? ` (${stats.pendingLeaves})`
              : ""}
          </button>
        ))}
      </div>

      {tab === "employees" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="flex-1 sm:max-w-xs">
              <Input
                type="text"
                placeholder="Search name, ID, role…"
                defaultValue={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) =>
                setDeptFilter(e.target.value as "All" | Department)
              }
              className={selectClass}
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Departments" : d}
                </option>
              ))}
            </select>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className={selectClass}
            >
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    {[
                      "Employee",
                      "Department",
                      "Role",
                      "Store",
                      "Joined",
                      "Status",
                    ].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {filteredEmployees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="px-4 py-3 text-start">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
                            {initials(e.name)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {e.name}
                            </p>
                            <p className="text-xs text-gray-500">{e.id}</p>
                            <p className="text-xs text-gray-400">{e.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {e.department}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {e.role}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {e.store}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(e.joinDate)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge size="sm" color={empStatusColor[e.status]}>
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                        No employees match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {tab === "attendance" && (
        <AttendanceManager employees={attendanceEmployees} />
      )}

      {tab === "leaves" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Employee",
                    "Type",
                    "From",
                    "To",
                    "Days",
                    "Reason",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="px-4 py-3 text-start">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {l.name}
                      </p>
                      <p className="text-xs text-gray-400">{l.employeeId}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {l.type}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(l.from)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(l.to)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {l.days}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 max-w-[200px]">
                      <span className="line-clamp-2">{l.reason}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge size="sm" color={leaveColor[l.status]}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {l.status === "Pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLeaveStatus(l.id, "Approved")}
                            className="text-sm font-medium text-success-600 hover:text-success-700"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setLeaveStatus(l.id, "Rejected")}
                            className="text-sm font-medium text-error-500 hover:text-error-600"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Add Employee
              </h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="empName">Full Name</Label>
                <input
                  id="empName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label htmlFor="empEmail">Email</Label>
                <input
                  id="empEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>Department</Label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value as Department)}
                  className={`${selectClass} w-full`}
                >
                  {departments
                    .filter((d) => d !== "All")
                    .map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="empRole">Role / Designation</Label>
                <input
                  id="empRole"
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Sales Executive"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <Label>Store</Label>
                <select
                  value={newStore}
                  onChange={(e) => setNewStore(e.target.value)}
                  className={`${selectClass} w-full`}
                >
                  {stores
                    .filter((s) => s !== "All Stores")
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addEmployee}
                disabled={
                  !newName.trim() || !newEmail.trim() || !newRole.trim()
                }
              >
                Add Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
