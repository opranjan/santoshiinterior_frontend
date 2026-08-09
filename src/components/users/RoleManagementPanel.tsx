"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { ApiError } from "@/lib/api";
import {
  BASE_ROLE_OPTIONS,
  type AccessRoleDto,
  type PermissionGroup,
} from "@/lib/permissions";
import { rolesApi } from "@/services/crmApi";

const accent = "#E85D75";

type RoleForm = {
  label: string;
  description: string;
  isGlobal: boolean;
  baseRole: string;
  permissions: string[];
};

function emptyForm(): RoleForm {
  return {
    label: "",
    description: "",
    isGlobal: false,
    baseRole: "SALES",
    permissions: [],
  };
}

function PermissionPicker({
  groups,
  selected,
  onChange,
}: {
  groups: PermissionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (key: string) => {
    onChange(
      selected.includes(key)
        ? selected.filter((p) => p !== key)
        : [...selected, key]
    );
  };

  const toggleGroup = (group: PermissionGroup, checked: boolean) => {
    const keys = group.permissions.map((p) => p.key);
    if (checked) {
      onChange([...new Set([...selected, ...keys])]);
    } else {
      onChange(selected.filter((p) => !keys.includes(p)));
    }
  };

  return (
    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
      {groups.map((group) => {
        const keys = group.permissions.map((p) => p.key);
        const selectedCount = keys.filter((k) => selected.includes(k)).length;
        const allSelected = selectedCount === keys.length && keys.length > 0;

        return (
          <div
            key={group.id}
            className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-white/[0.03]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white/90">
                  {group.label}
                </p>
                <p className="text-xs text-gray-500">{group.description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleGroup(group, !allSelected)}
                className="shrink-0 text-xs font-medium text-[#E85D75] hover:underline"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.permissions.map((perm) => {
                const checked = selected.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 transition ${
                      checked
                        ? "border-[#E85D75]/40 bg-[#E85D75]/5"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(perm.key)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#E85D75]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                        {perm.label}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {perm.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleEditorModal({
  open,
  title,
  initial,
  groups,
  saving,
  isSystem,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: RoleForm;
  groups: PermissionGroup[];
  saving: boolean;
  isSystem?: boolean;
  onClose: () => void;
  onSave: (form: RoleForm) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose what this role can access in the CRM.
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

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Role name</Label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g. Sales Team South Goa"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What can people with this role do?"
              />
            </div>
            <div>
              <Label>Security level (base role)</Label>
              <select
                value={form.baseRole}
                onChange={(e) =>
                  setForm((f) => ({ ...f, baseRole: e.target.value }))
                }
                disabled={isSystem}
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {BASE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Used for core API security checks.
              </p>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={form.isGlobal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isGlobal: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#E85D75]"
                />
                <span>
                  <span className="block text-sm font-medium">Global access</span>
                  <span className="block text-xs text-gray-500">
                    Can work across all stores
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <Label className="mb-0">Access permissions</Label>
              <span className="text-xs text-gray-500">
                {form.permissions.length} selected
              </span>
            </div>
            <PermissionPicker
              groups={groups}
              selected={form.permissions}
              onChange={(permissions) =>
                setForm((f) => ({ ...f, permissions }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            className="bg-[#E85D75] hover:bg-[#d94c65]"
            onClick={() => void onSave(form)}
          >
            {saving ? "Saving…" : "Save Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RoleManagementPanel() {
  const [roles, setRoles] = useState<AccessRoleDto[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessRoleDto | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [rolesRes, groupsRes] = await Promise.all([
        rolesApi.list(),
        rolesApi.listPermissions(),
      ]);
      setRoles(rolesRes);
      setGroups(groupsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
    );
  }, [roles, search]);

  const editorInitial = useMemo((): RoleForm => {
    if (!editingRole) return emptyForm();
    return {
      label: editingRole.label,
      description: editingRole.description || "",
      isGlobal: editingRole.isGlobal,
      baseRole: editingRole.baseRole,
      permissions: editingRole.permissions || [],
    };
  }, [editingRole]);

  const saveRole = async (form: RoleForm) => {
    if (!form.label.trim()) {
      setError("Role name is required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const body = {
        label: form.label.trim(),
        description: form.description.trim() || null,
        isGlobal: form.isGlobal,
        baseRole: form.baseRole,
        permissions: form.permissions,
      };

      if (editingRole) {
        await rolesApi.update(editingRole.id, body);
        setNotice("Role updated");
      } else {
        await rolesApi.create(body);
        setNotice("Role created");
      }

      setEditorOpen(false);
      setEditingRole(null);
      await load();
      window.setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save role"
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicateRole = async (role: AccessRoleDto) => {
    try {
      setError("");
      await rolesApi.duplicate(role.id);
      setNotice(`Duplicated "${role.label}"`);
      await load();
      window.setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate role");
    }
  };

  const deleteRole = async (role: AccessRoleDto) => {
    if (role.isSystem) return;
    const ok = window.confirm(
      `Delete role "${role.label}"? Users must be reassigned first.`
    );
    if (!ok) return;
    try {
      setError("");
      await rolesApi.remove(role.id);
      setNotice("Role deleted");
      await load();
      window.setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete role");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Role Management
          </h2>
          <p className="text-sm text-gray-500">
            Create roles and control what each team can access.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#E85D75] hover:bg-[#d94c65]"
          onClick={() => {
            setEditingRole(null);
            setEditorOpen(true);
          }}
        >
          + Create Role
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </div>
      ) : null}

      <div className="relative max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-gray-500">Loading roles…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#E85D75]/30 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white/90">
                      {role.label}
                    </h3>
                    {role.isGlobal ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        🌐 Global
                      </span>
                    ) : null}
                    {role.isSystem ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        System
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{role.key}</p>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 min-h-[40px] text-sm text-gray-600 dark:text-gray-300">
                {role.description || "No description"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                  {role.userCount ?? 0} users
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                  {role.permissions?.length ?? 0} permissions
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                  {role.baseRole}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRole(role);
                    setEditorOpen(true);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#E85D75] hover:bg-[#E85D75]/10"
                >
                  Edit access
                </button>
                <button
                  type="button"
                  onClick={() => void duplicateRole(role)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Duplicate
                </button>
                {!role.isSystem ? (
                  <button
                    type="button"
                    onClick={() => void deleteRole(role)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <RoleEditorModal
        open={editorOpen}
        title={editingRole ? `Edit — ${editingRole.label}` : "Create Role"}
        initial={editorInitial}
        groups={groups}
        saving={saving}
        isSystem={editingRole?.isSystem}
        onClose={() => {
          setEditorOpen(false);
          setEditingRole(null);
        }}
        onSave={saveRole}
      />
    </div>
  );
}
