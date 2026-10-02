"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { formatActivityDate } from "@/lib/userRoles";
import { generateTempPassword } from "@/components/users/UserFormModal";
import { projectsApi, rolesApi, storesApi, usersApi } from "@/services/crmApi";

const CATEGORIES = [
  "Carpenter",
  "Painter",
  "Modular & Kitchen",
  "Electrician",
  "Plumbing",
  "Other",
];

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const card =
  "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";

type AssigneeUser = {
  id: string;
  name: string;
  roleLabel?: string | null;
  accessRole?: { key?: string; label?: string } | null;
};

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  assignees?: Array<{ userId?: string; user?: AssigneeUser | null }>;
};

function isFranchiseeAccount(user: { accessRole?: { key?: string; label?: string } | null }) {
  return (
    user.accessRole?.key === "FRANCHISEE" ||
    /franchisee/i.test(String(user.accessRole?.label || ""))
  );
}

function projectFranchiseeIds(project: ProjectRow) {
  return (project.assignees || [])
    .map((row) => row.userId || row.user?.id)
    .filter(Boolean) as string[];
}

function categoryOf(user: AuthUser) {
  const label = user.roleLabel || "";
  if (label && !/franchisee/i.test(label)) return label;
  return "Carpenter";
}

export default function AdminFranchiseeManager() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [franchiseeRoleId, setFranchiseeRoleId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [assigning, setAssigning] = useState<AuthUser | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: generateTempPassword(),
    category: "Carpenter",
    storeId: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [roles, storesRes, usersRes, projectRes] = await Promise.all([
        rolesApi.list(),
        storesApi.list({ limit: 100 }),
        usersApi.list({ limit: 200, isActive: "all" }),
        projectsApi.list({ limit: 200 }),
      ]);
      const roleId = roles.find((r) => r.key === "FRANCHISEE")?.id || "";
      setFranchiseeRoleId(roleId);
      setStores(storesRes.items.map((s) => ({ id: s.id, name: s.name })));
      setProjects((projectRes.items || []) as ProjectRow[]);
      setUsers(
        (usersRes.items || []).filter((u) => isFranchiseeAccount(u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load franchisees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter === "active" && user.isActive === false) return false;
      if (statusFilter === "inactive" && user.isActive !== false) return false;
      if (!q) return true;
      return [user.name, user.email, user.phone, categoryOf(user), user.store?.name]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, statusFilter]);

  const totals = useMemo(() => {
    const active = users.filter((u) => u.isActive !== false).length;
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      projects: users.reduce((sum, u) => sum + (u._count?.assignedProjects || 0), 0),
    };
  }, [users]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: generateTempPassword(),
      category: "Carpenter",
      storeId: "",
    });
    setFormOpen(true);
  };

  const openEdit = (user: AuthUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      category: categoryOf(user),
      storeId: user.storeId || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!franchiseeRoleId) {
      setError("Franchisee role is not ready. Restart the API, then try again.");
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!editing && !form.password.trim()) {
      setError("Password is required for a new franchisee login.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        accessRoleId: franchiseeRoleId,
        roleLabel: form.category,
        storeId: form.storeId || null,
      };
      if (editing) {
        await usersApi.update(editing.id, {
          ...body,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        setNotice("Franchisee updated.");
        if (form.password.trim()) {
          setCredentials({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
          });
        }
      } else {
        await usersApi.create({
          ...body,
          password: form.password.trim(),
          isActive: true,
        });
        setCredentials({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
        });
        setNotice("Franchisee created. Copy the login and share it.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save franchisee");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AuthUser) => {
    try {
      if (user.isActive !== false) await usersApi.deactivate(user.id);
      else await usersApi.activate(user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const openAssign = (user: AuthUser) => {
    setAssigning(user);
    setSelectedProjectIds(
      projects.filter((p) => projectFranchiseeIds(p).includes(user.id)).map((p) => p.id)
    );
  };

  const saveAssign = async () => {
    if (!assigning) return;
    setSaving(true);
    setError("");
    try {
      await usersApi.setProjects(assigning.id, selectedProjectIds);
      setNotice("Assigned projects updated.");
      setAssigning(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign projects");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Franchisee Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create franchisee logins, set work category, and assign projects to franchisees.
            This is separate from a project’s Assigned To person in CRM. One project can go to several franchisees.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          + Add Franchisee
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-gray-500">Total Franchisees</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">{totals.total}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-success-600">{totals.active}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-error-500">{totals.inactive}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500">Assigned Projects</p>
          <p className="mt-2 text-2xl font-semibold text-warning-600">{totals.projects}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, category…"
          className="h-10 min-w-[240px] rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "all")}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2">Franchisee</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Store</th>
                <th className="px-4 py-2">Projects</th>
                <th className="px-4 py-2">Last login</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-white/90">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{categoryOf(user)}</td>
                  <td className="px-4 py-3 text-gray-600">{user.store?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user._count?.assignedProjects ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatActivityDate(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge size="sm" color={user.isActive === false ? "error" : "success"}>
                      {user.isActive === false ? "Inactive" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-600"
                        onClick={() => openEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-600"
                        onClick={() => openAssign(user)}
                      >
                        Projects
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-gray-500"
                        onClick={() => void toggleActive(user)}
                      >
                        {user.isActive === false ? "Activate" : "Deactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No franchisees yet. Add one and share the login.
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editing ? "Edit Franchisee" : "Add Franchisee"}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-sm text-gray-600">Full name</p>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Email (login)</p>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Phone</p>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Work category</p>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={fieldClass}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">Store</p>
                <select
                  value={form.storeId}
                  onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="">No store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-600">
                  {editing ? "New password (optional)" : "Temporary password"}
                </p>
                <div className="flex gap-2">
                  <input
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={fieldClass}
                    placeholder={editing ? "Leave blank to keep current" : ""}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm((f) => ({ ...f, password: generateTempPassword() }))
                    }
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {assigning ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Assign to franchisee
                </h3>
                <p className="text-sm text-gray-500">
                  {assigning.name} will see these projects. CRM Assigned To is unchanged. Other
                  franchisees on the same project stay assigned.
                </p>
              </div>
              <button type="button" onClick={() => setAssigning(null)} className="text-gray-400">
                ✕
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {projects.map((project) => {
                const checked = selectedProjectIds.includes(project.id);
                const others = (project.assignees || [])
                  .map((row) => row.user)
                  .filter(
                    (user): user is AssigneeUser =>
                      Boolean(user && user.id !== assigning.id && isFranchiseeAccount(user))
                  );
                const crmOwner = project.assignedTo?.name || "";
                return (
                  <label
                    key={project.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedProjectIds((ids) =>
                          e.target.checked
                            ? [...ids, project.id]
                            : ids.filter((id) => id !== project.id)
                        );
                      }}
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                        {project.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {project.clientName || "—"}
                        {crmOwner ? ` · CRM Assigned To: ${crmOwner}` : ""}
                        {others.length
                          ? ` · other franchisees: ${others.map((user) => user.name).join(", ")}`
                          : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
              {!projects.length ? (
                <p className="py-8 text-center text-sm text-gray-400">No projects in CRM yet.</p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssigning(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void saveAssign()} disabled={saving}>
                {saving ? "Saving…" : "Save assignments"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {credentials ? (
        <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share login details
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Give these to the franchisee. They sign in at the same CRM login page.
            </p>
            <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5">
              <div>
                <dt className="text-xs text-gray-500">Name</dt>
                <dd className="font-medium">{credentials.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Email</dt>
                <dd className="font-medium">{credentials.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Password</dt>
                <dd className="font-mono font-medium">{credentials.password}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const text = [
                    `Name: ${credentials.name}`,
                    `Email: ${credentials.email}`,
                    `Password: ${credentials.password}`,
                    `Login: ${origin}/signin`,
                  ].join("\n");
                  try {
                    await navigator.clipboard.writeText(text);
                    setNotice("Login details copied");
                  } catch {
                    setError("Could not copy. Copy the details manually.");
                  }
                }}
              >
                Copy details
              </Button>
              <Button size="sm" onClick={() => setCredentials(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
