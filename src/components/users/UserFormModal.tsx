"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { AuthUser } from "@/lib/auth";
import type { AccessRoleDto } from "@/lib/permissions";

export type UserFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  accessRoleId: string;
  dateOfBirth: string;
  managerId: string;
  storeId: string;
};

export function emptyUserForm(defaultRoleId = ""): UserFormState {
  return {
    name: "",
    email: "",
    phone: "",
    password: "Welcome@123",
    accessRoleId: defaultRoleId,
    dateOfBirth: "",
    managerId: "",
    storeId: "",
  };
}

export default function UserFormModal({
  open,
  title,
  initial,
  roles,
  managers,
  stores,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: UserFormState;
  roles: AccessRoleDto[];
  managers: AuthUser[];
  stores: Array<{ id: string; name: string }>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: UserFormState) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [roleSearch, setRoleSearch] = useState("");
  const isEdit = title.includes("Edit");

  useEffect(() => {
    if (open) {
      setForm(initial);
      setRoleSearch("");
    }
  }, [open, initial]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const selectedRole = roles.find((r) => r.id === form.accessRoleId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Add login details and assign a role for CRM access.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mukesh Singh"
              />
            </div>
            <div>
              <Label>Email (login)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <Label>Mobile number</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            {!isEdit ? (
              <div className="sm:col-span-2">
                <Label>Temporary password</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Share this with the user for first login.
                </p>
              </div>
            ) : null}
            <div>
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Manager</Label>
              <select
                value={form.managerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, managerId: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">No manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Store</Label>
              <select
                value={form.storeId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, storeId: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Global — all stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="mb-0">Assign role</Label>
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles"
                className="h-8 w-40 rounded-lg border border-gray-200 px-2 text-xs dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredRoles.map((role) => {
                const active = form.accessRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, accessRoleId: role.id }))
                    }
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-[#E85D75] bg-[#E85D75]/5 ring-1 ring-[#E85D75]/30"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white/90">
                        {role.label}
                      </span>
                      {role.isGlobal ? (
                        <span className="text-[10px] text-gray-500">Global</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                      {role.permissions?.length ?? 0} permissions ·{" "}
                      {role.description || role.baseRole}
                    </p>
                  </button>
                );
              })}
            </div>
            {selectedRole ? (
              <p className="mt-2 text-xs text-gray-500">
                Selected: <strong>{selectedRole.label}</strong> — user will get{" "}
                {selectedRole.permissions?.length ?? 0} access permissions.
              </p>
            ) : (
              <p className="mt-2 text-xs text-red-500">Please select a role.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving || !form.accessRoleId}
            className="bg-[#E85D75] hover:bg-[#d94c65]"
            onClick={() => void onSubmit(form)}
          >
            {saving ? "Saving…" : "Save User"}
          </Button>
        </div>
      </div>
    </div>
  );
}
