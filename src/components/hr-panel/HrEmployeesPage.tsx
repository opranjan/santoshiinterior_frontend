"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hrApi, type HrAssignableRole } from "@/services/crmApi";
import { mapEmployee } from "@/lib/crmMappers";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/toast/ToastHost";
import LeadColumnFilterMenu from "@/components/leads/LeadColumnFilterMenu";
import { Modal } from "@/components/ui/modal";
import HrPageHeader from "./HrPageHeader";
import { deptLabel, initials } from "./hrDisplay";

type Emp = ReturnType<typeof mapEmployee>;

type InfoDialog = {
  tone: "success" | "warning";
  title: string;
  message: string;
  detail?: string | null;
};

const COLUMN_FILTER_KEYS = [
  "employee",
  "department",
  "designation",
  "joinDate",
  "status",
] as const;

type ColumnFilterKey = (typeof COLUMN_FILTER_KEYS)[number];

const emptyColumnFilters = (): Record<ColumnFilterKey, string[] | null> => ({
  employee: null,
  department: null,
  designation: null,
  joinDate: null,
  status: null,
});

function employeeValue(emp: Emp) {
  return emp.name || emp.email || emp.id;
}

function departmentValue(emp: Emp) {
  return deptLabel(emp.department) || "Other";
}

function designationValue(emp: Emp) {
  return emp.role?.trim() || "—";
}

function joinDateValue(emp: Emp) {
  return emp.joinDate || "—";
}

function statusValue(emp: Emp) {
  return emp.status || "—";
}

function uniqueOptions(
  items: Emp[],
  getValue: (emp: Emp) => string,
  getLabel?: (value: string) => string
) {
  const seen = new Map<string, string>();
  for (const emp of items) {
    const value = getValue(emp);
    if (!seen.has(value)) {
      seen.set(value, getLabel ? getLabel(value) : value);
    }
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default function HrEmployeesPage() {
  const [items, setItems] = useState<Emp[]>([]);
  const [roles, setRoles] = useState<HrAssignableRole[]>([]);
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] =
    useState<Record<ColumnFilterKey, string[] | null>>(emptyColumnFilters);
  const [openColumnFilter, setOpenColumnFilter] = useState<ColumnFilterKey | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Emp | null>(null);
  const [infoDialog, setInfoDialog] = useState<InfoDialog | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    accessRoleId: "",
    roleTitle: "",
    joinDate: "",
  });

  const load = async () => {
    const [employees, assignableRoles] = await Promise.all([
      hrApi.listEmployees({ limit: 200 }),
      hrApi.listAssignableRoles().catch(() => [] as HrAssignableRole[]),
    ]);
    setItems((employees.items || []).map((row) => mapEmployee(row)));
    setRoles(assignableRoles || []);
    setForm((f) => ({
      ...f,
      accessRoleId: f.accessRoleId || assignableRoles[0]?.id || "",
    }));
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  const columnOptions = useMemo(
    () => ({
      employee: uniqueOptions(items, employeeValue),
      department: uniqueOptions(items, departmentValue),
      designation: uniqueOptions(items, designationValue),
      joinDate: uniqueOptions(items, joinDateValue),
      status: uniqueOptions(items, statusValue),
    }),
    [items]
  );

  const hasColumnFilters = COLUMN_FILTER_KEYS.some(
    (key) => Array.isArray(columnFilters[key]) && columnFilters[key]!.length > 0
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      if (q) {
        const hay = [e.name, e.email, e.phone, e.department, e.role, e.store, e.status, e.joinDate]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const checks: Array<[ColumnFilterKey, string]> = [
        ["employee", employeeValue(e)],
        ["department", departmentValue(e)],
        ["designation", designationValue(e)],
        ["joinDate", joinDateValue(e)],
        ["status", statusValue(e)],
      ];
      for (const [key, value] of checks) {
        const selected = columnFilters[key];
        if (Array.isArray(selected) && selected.length > 0 && !selected.includes(value)) {
          return false;
        }
      }
      return true;
    });
  }, [items, search, columnFilters]);

  const setColumnFilterValue = (key: ColumnFilterKey, next: string[] | null) => {
    setColumnFilters((prev) => ({ ...prev, [key]: next }));
  };

  const clearFilters = () => {
    setSearch("");
    setColumnFilters(emptyColumnFilters());
    setOpenColumnFilter(null);
  };

  const confirmRemoveEmployee = async () => {
    if (!removeTarget || removingId) return;
    const emp = removeTarget;
    setRemovingId(emp.id);
    setError("");
    try {
      await hrApi.removeEmployee(emp.id);
      setItems((prev) => prev.filter((row) => row.id !== emp.id));
      setRemoveTarget(null);
      toastSuccess(`Removed ${emp.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove employee";
      setError(message);
      toastError(message, "Remove failed");
    } finally {
      setRemovingId(null);
    }
  };

  const add = async () => {
    if (!form.name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required to create a login user");
      toastWarning("Enter an email so this employee can log in");
      return;
    }
    if (!form.accessRoleId) {
      setError("Select a login role");
      toastWarning("Select a role before adding the employee");
      return;
    }

    const email = form.email.trim().toLowerCase();
    const existing = items.find(
      (row) => String(row.email || "").trim().toLowerCase() === email
    );
    if (existing) {
      const message = `Employee “${existing.name}” already uses ${email}. Duplicate employees are not allowed.`;
      setError(message);
      toastWarning(message, "Duplicate employee");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await hrApi.createEmployee({
        name: form.name.trim(),
        email,
        phone: form.phone.trim() || null,
        accessRoleId: form.accessRoleId,
        roleTitle: form.roleTitle.trim() || null,
        joinDate: form.joinDate || null,
        status: "ACTIVE",
      });

      const account = created.userAccount;
      if (!account?.hasLogin) {
        toastWarning(
          "Employee was saved, but no login user was created.",
          "No login user"
        );
        setInfoDialog({
          tone: "warning",
          title: "No login user created",
          message:
            "Employee was added, but a login user was not created. Add this person under Users so they can sign in.",
          detail: email,
        });
      } else if (account.created && account.temporaryPassword) {
        toastSuccess("Employee added with a new login user");
        setInfoDialog({
          tone: "success",
          title: "Employee & login created",
          message: "Share this temporary password securely with the employee.",
          detail: `Email: ${email}\nPassword: ${account.temporaryPassword}`,
        });
      } else if (account.linked) {
        toastSuccess("Employee added and linked to the existing login user");
      } else {
        toastSuccess("Employee added");
      }

      setForm({
        name: "",
        email: "",
        phone: "",
        accessRoleId: roles[0]?.id || "",
        roleTitle: "",
        joinDate: "",
      });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add employee";
      setError(message);
      toastWarning(message, "Could not add");
    } finally {
      setSaving(false);
    }
  };

  const filterHeaders: Array<{
    key: ColumnFilterKey;
    label: string;
    allLabel: string;
  }> = [
    { key: "employee", label: "Employee", allLabel: "All employees" },
    { key: "department", label: "Department", allLabel: "All departments" },
    { key: "designation", label: "Designation", allLabel: "All designations" },
    { key: "joinDate", label: "Join Date", allLabel: "All dates" },
    { key: "status", label: "Status", allLabel: "All statuses" },
  ];

  return (
    <div className="space-y-5">
      <HrPageHeader
        crumb="HR › Employees"
        title="Employees"
        subtitle="Directory of Santoshi Interiors team members"
      />
      {error ? <p className="text-sm text-error-600">{error}</p> : null}

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <select
            className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
            value={form.accessRoleId}
            onChange={(e) => {
              const accessRoleId = e.target.value;
              const role = roles.find((r) => r.id === accessRoleId);
              setForm((f) => ({
                ...f,
                accessRoleId,
                roleTitle: f.roleTitle || role?.label || "",
              }));
            }}
          >
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]"
            placeholder="Designation"
            value={form.roleTitle}
            onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
          />
          <button
            type="button"
            disabled={saving || !form.name.trim()}
            onClick={() => void add()}
            className="h-11 rounded-xl bg-[#1c1610] text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] disabled:opacity-50"
          >
            {saving ? "Saving…" : "+ Add"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#8a7b68]">
          Role is loaded from Users › Roles. Email + role create a login user (duplicates by email are blocked).
        </p>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, department…"
            className="h-11 w-full rounded-xl border border-[#eadfcf] bg-white px-3 text-sm dark:border-[#3a342c] dark:bg-[#1a1714] sm:max-w-sm"
          />
          {search || hasColumnFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-[#eadfcf] bg-white px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#6b5d4d] dark:border-[#3a342c] dark:bg-[#1a1714]"
            >
              Clear filters
            </button>
          ) : null}
          <span className="text-xs text-[#8a7b68]">
            Showing {rows.length} of {items.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-[#8a7b68]">
              <tr>
                {filterHeaders.map((col) => (
                  <th key={col.key} className="pb-2">
                    <div className="inline-flex items-center gap-1">
                      <span>{col.label}</span>
                      <LeadColumnFilterMenu
                        label={col.label}
                        allLabel={col.allLabel}
                        options={columnOptions[col.key]}
                        selected={columnFilters[col.key]}
                        onChange={(next) => setColumnFilterValue(col.key, next)}
                        open={openColumnFilter === col.key}
                        onOpenChange={(nextOpen) =>
                          setOpenColumnFilter(nextOpen ? col.key : null)
                        }
                      />
                    </div>
                  </th>
                ))}
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#8a7b68]">
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((emp) => (
                  <tr key={emp.id} className="border-t border-[#eadfcf]">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1c1610] text-[10px] text-[#e8d5b5]">
                          {initials(emp.name)}
                        </span>
                        <span>
                          <span className="block font-medium text-[#1c1610] dark:text-[#f3ece2]">
                            {emp.name}
                          </span>
                          <span className="text-xs text-[#8a7b68]">
                            {emp.email || emp.phone}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3">{departmentValue(emp)}</td>
                    <td className="py-3">{designationValue(emp)}</td>
                    <td className="py-3">{joinDateValue(emp)}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-[#e8f3ea] px-2 py-0.5 text-[11px] font-semibold text-[#2f6b3a]">
                        {statusValue(emp)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/hr/payroll/slips?employee=${emp.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.1em] text-[#c4a574]"
                        >
                          Salary slip
                        </Link>
                        <button
                          type="button"
                          disabled={Boolean(removingId)}
                          onClick={() => setRemoveTarget(emp)}
                          className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9a3b2f] transition hover:text-[#7a2f26] disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={Boolean(removeTarget)}
        onClose={() => {
          if (!removingId) setRemoveTarget(null);
        }}
        showCloseButton={false}
        className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white p-0 shadow-[0_28px_90px_rgba(28,22,16,0.28)] dark:border-[#3a342c] dark:bg-[#161411]"
        overlayClassName="fixed inset-0 h-full w-full bg-[#1c1610]/50 backdrop-blur-[3px]"
      >
        {removeTarget ? (
          <div className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=60)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-[#c4a574]/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-[#c4a574]/20 blur-2xl" />

            <div className="relative px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/logo/santoshi-interiors.jpg"
                    alt="Santoshi Interiors"
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-[#eadfcf]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                      Santoshi Interiors
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#c4a574]">
                      CRM
                    </p>
                  </div>
                </div>
                <p className="hidden pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68] sm:block">
                  HR <span className="text-[#c4a574]">›</span> Employees
                </p>
                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={() => setRemoveTarget(null)}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#eadfcf] bg-white text-[#8a7b68] transition hover:bg-[#f7f1e8] hover:text-[#1c1610] disabled:opacity-50 dark:border-[#3a342c] dark:bg-[#1a1714]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fde8e8] text-[#c0392b] shadow-[inset_0_0_0_6px_rgba(192,57,43,0.06)]">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12"
                      />
                    </svg>
                  </div>
                  <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#c0392b] text-[11px] font-bold text-white shadow-md">
                    !
                  </span>
                </div>

                <h3
                  className="mt-4 font-serif text-[1.55rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Remove Employee?
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-[#6b5d4d] dark:text-[#cbbba5]">
                  This action cannot be undone. Please confirm to proceed.
                </p>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#eadfcf] bg-[#f7f1e8]/95 px-3.5 py-3 dark:border-[#3a342c] dark:bg-[#1a1714]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1c1610] text-[11px] font-semibold text-[#e8d5b5]">
                  {initials(removeTarget.name)}
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                    {removeTarget.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#8a7b68]">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="truncate">
                      {removeTarget.email || removeTarget.phone || "No contact on file"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-3 rounded-2xl border border-[#f0c7c2] bg-[#fdf2f0] px-3.5 py-3 text-left dark:border-[#5a3530] dark:bg-[#2a1816]">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c0392b]/10 text-[#c0392b]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L1 21h22L12 2zm0 4.5L19.5 19h-15L12 6.5zM11 10v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#c0392b]">Please Note</p>
                  <ul className="mt-1.5 space-y-1 text-[13px] leading-snug text-[#6b5d4d] dark:text-[#d4c4b4]">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4a574]" />
                      This permanently deletes the employee record from HR.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4a574]" />
                      Their login user stays under Users unless you remove it there.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4a574]" />
                      This action cannot be undone.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={() => setRemoveTarget(null)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-[#c4a574] bg-white text-sm font-semibold text-[#1c1610] transition hover:bg-[#faf6ef] disabled:opacity-50 dark:bg-[#1a1714] dark:text-[#f3ece2]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={() => void confirmRemoveEmployee()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#c0392b] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(192,57,43,0.35)] transition hover:bg-[#a93226] disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12"
                    />
                  </svg>
                  {removingId ? "Removing…" : "Remove Employee"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(infoDialog)}
        onClose={() => setInfoDialog(null)}
        showCloseButton={false}
        className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-[#eadfcf] bg-white p-0 shadow-[0_28px_90px_rgba(28,22,16,0.28)] dark:border-[#3a342c] dark:bg-[#161411]"
        overlayClassName="fixed inset-0 h-full w-full bg-[#1c1610]/50 backdrop-blur-[3px]"
      >
        {infoDialog ? (
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-[#c4a574]/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-[#c4a574]/20 blur-2xl" />
            <div className="relative px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/logo/santoshi-interiors.jpg"
                    alt="Santoshi Interiors"
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-[#eadfcf]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1c1610] dark:text-[#f3ece2]">
                      Santoshi Interiors
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#c4a574]">
                      CRM
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoDialog(null)}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#eadfcf] bg-white text-[#8a7b68] transition hover:bg-[#f7f1e8] dark:border-[#3a342c] dark:bg-[#1a1714]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 text-center">
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                    infoDialog.tone === "success"
                      ? "bg-[#e8f3ea] text-[#2f6b3a]"
                      : "bg-[#f8e8c8] text-[#8a5a12]"
                  }`}
                >
                  {infoDialog.tone === "success" ? (
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                  )}
                </div>
                <h3
                  className="mt-4 font-serif text-[1.45rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {infoDialog.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5c5146] dark:text-[#cbbba5]">
                  {infoDialog.message}
                </p>
              </div>

              {infoDialog.detail ? (
                <div className="mt-4 rounded-2xl border border-[#eadfcf] bg-[#f7f1e8]/95 px-4 py-3 text-left dark:border-[#3a342c] dark:bg-[#1a1714]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a7748]">
                    Details
                  </p>
                  <pre className="mt-1.5 whitespace-pre-wrap font-sans text-sm text-[#1c1610] dark:text-[#f3ece2]">
                    {infoDialog.detail}
                  </pre>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setInfoDialog(null)}
                className="mt-5 h-12 w-full rounded-2xl bg-[#1c1610] text-sm font-semibold uppercase tracking-[0.08em] text-[#e8d5b5] transition hover:bg-[#2a2118]"
              >
                Got it
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
