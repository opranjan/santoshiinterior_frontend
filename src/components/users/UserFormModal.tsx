"use client";

import React, { useEffect, useMemo, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { AuthUser } from "@/lib/auth";
import type { AccessRoleDto } from "@/lib/permissions";

export type UserFormState = {
  name: string;
  email: string;
  phone: string;
  sipExtension: string;
  password: string;
  accessRoleId: string;
  dateOfBirth: string;
  managerId: string;
  storeId: string;
  vendorId: string;
};

export function emptyUserForm(defaultRoleId = ""): UserFormState {
  return {
    name: "",
    email: "",
    phone: "",
    sipExtension: "",
    password: generateTempPassword(),
    accessRoleId: defaultRoleId,
    dateOfBirth: "",
    managerId: "",
    storeId: "",
    vendorId: "",
  };
}

export function generateTempPassword() {
  const chunk = Math.random().toString(36).slice(-6).toUpperCase();
  return `Fr@${chunk}1`;
}

export default function UserFormModal({
  open,
  title,
  initial,
  roles,
  managers,
  stores,
  vendors = [],
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
  vendors?: Array<{ id: string; name: string }>;
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
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="border-b border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {title}
              </h3>
              <p className="mt-1 text-sm text-[#8a7b68]">
                {title.includes("Franchisee")
                  ? "Create a franchisee login. Copy the email and password after save and share them."
                  : "Add login details and assign a role for CRM access."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#8a7b68] hover:bg-[#eadfcf] dark:hover:bg-[#2a251f]"
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
            <div>
              <Label>SIP / PBX extension</Label>
              <Input
                value={form.sipExtension}
                onChange={(e) => setForm((f) => ({ ...f, sipExtension: e.target.value }))}
                placeholder="101"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Jio SIP click-to-call rings this extension first.
              </p>
            </div>
            {!isEdit ? (
              <div className="sm:col-span-2">
                <Label>Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-[#eadfcf] bg-white px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                    onClick={() =>
                      setForm((f) => ({ ...f, password: generateTempPassword() }))
                    }
                  >
                    Generate
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Copy this after save and share it with the user. They sign in at the CRM login page.
                </p>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <Label>Set new password (optional)</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep current password"
                />
              </div>
            )}
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
                className="h-11 w-full appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm text-[#1c1610] outline-none dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
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
                className="h-11 w-full appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm text-[#1c1610] outline-none dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
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
                className="h-8 w-40 rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-2 text-xs text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
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
                        ? "border-[#c4a574] bg-[#e8d5b5]/20 ring-1 ring-[#c4a574]/40"
                        : "border-[#eadfcf] hover:border-[#c4a574] dark:border-[#3a342c]"
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
                    {role.key === "FRANCHISEE" ? (
                      <p className="mt-1 text-[11px] font-medium text-[#9a7748]">
                        After login they see assigned projects from the CRM. They cannot add projects.
                      </p>
                    ) : null}
                    {role.key === "VENDOR" ? (
                      <p className="mt-1 text-[11px] font-medium text-[#9a7748]">
                        After login they see vendor dashboard, design, assigned projects, and procurement.
                      </p>
                    ) : null}
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
            {selectedRole?.key === "VENDOR" ? (
              <div className="mt-4">
                <Label>Vendor company</Label>
                <select
                  value={form.vendorId}
                  onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3 text-sm text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#eadfcf] px-6 py-4 dark:border-[#3a342c]">
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !form.accessRoleId || (selectedRole?.key === "VENDOR" && !form.vendorId)}
            className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
            onClick={() => void onSubmit(form)}
          >
            {saving ? "Saving…" : "Save user"}
          </button>
        </div>
      </div>
    </div>
  );
}
