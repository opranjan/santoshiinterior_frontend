"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { formatActivityDate } from "@/lib/userRoles";
import { generateTempPassword } from "@/components/users/UserFormModal";
import { projectsApi, rolesApi, storesApi, usersApi, vendorsApi } from "@/services/crmApi";

const CATEGORIES = [
  "Carpenter",
  "Painter",
  "Modular & Kitchen",
  "Electrician",
  "Plumbing",
  "Other",
];

const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-4 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";
const actionBtn =
  "inline-flex h-8 items-center rounded-lg px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:bg-[#eadfcf] hover:text-[#1c1610] dark:hover:bg-[#2a251f] dark:hover:text-[#f3ece2]";

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
    /franchisee/i.test(String(user.accessRole?.label || "")) ||
    /vendor panel/i.test(String(user.accessRole?.label || ""))
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
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
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
    vendorId: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [roles, storesRes, usersRes, projectRes, vendorsRes] = await Promise.all([
        rolesApi.list(),
        storesApi.list({ limit: 100 }),
        usersApi.list({ limit: 200, isActive: "all" }),
        projectsApi.list({ limit: 200 }),
        vendorsApi.list({ limit: 200 }).catch(() => ({ items: [] })),
      ]);
      const roleId = roles.find((r) => r.key === "FRANCHISEE")?.id || "";
      setFranchiseeRoleId(roleId);
      setStores(storesRes.items.map((s) => ({ id: s.id, name: s.name })));
      setVendors((vendorsRes.items || []).map((v) => ({ id: v.id, name: v.name })));
      setProjects((projectRes.items || []) as ProjectRow[]);
      setUsers(
        (usersRes.items || []).filter((u) => isFranchiseeAccount(u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor logins");
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
      vendorId: "",
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
      vendorId: user.vendorId || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!franchiseeRoleId) {
      setError("Vendor panel role is not ready. Restart the API, then try again.");
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!editing && !form.password.trim()) {
      setError("Password is required for a new vendor login.");
      return;
    }
    if (!form.vendorId) {
      setError("Select the vendor for this login.");
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
        vendorId: form.vendorId || null,
      };
      if (editing) {
        await usersApi.update(editing.id, {
          ...body,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        setNotice("Vendor updated.");
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
        setNotice("Vendor created. Copy the login and share it.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save vendor");
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Network
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Vendor Panel
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#8a7b68]">
            Create vendor panel logins, set work category, and assign projects.
            One project can go to several vendors.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
        >
          Add vendor
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] xl:grid-cols-4 xl:divide-y-0 dark:divide-[#3a342c]">
          {[
            { label: "Total vendors", value: totals.total },
            { label: "Active", value: totals.active },
            { label: "Inactive", value: totals.inactive },
            { label: "Assigned projects", value: totals.projects },
          ].map((kpi) => (
            <div key={kpi.label} className="px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                {kpi.label}
              </p>
              <p
                className="mt-1.5 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, category…"
            className={`${fieldClass} min-w-[240px] flex-1`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "all")}
            className={fieldClass}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f6efe4] text-left dark:bg-[#1a1714]">
              <tr>
                {["Login", "Vendor", "Phone", "Category", "Store", "Projects", "Last login", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eadfcf] dark:divide-[#3a342c]">
              {filtered.map((user) => (
                <tr key={user.id} className="store-row">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{user.name}</p>
                    <p className="text-xs text-[#8a7b68]">{user.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[#8a7b68]">{user.vendor?.name || "—"}</td>
                  <td className="px-4 py-3.5 text-[#8a7b68]">{user.phone || "—"}</td>
                  <td className="px-4 py-3.5 text-[#8a7b68]">{categoryOf(user)}</td>
                  <td className="px-4 py-3.5 text-[#8a7b68]">{user.store?.name || "—"}</td>
                  <td className="px-4 py-3.5 text-[#1c1610] dark:text-[#f3ece2]">
                    {user._count?.assignedProjects ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-[#8a7b68]">
                    {formatActivityDate(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        user.isActive === false
                          ? "bg-[#eadfcf] text-[#8a7b68] dark:bg-[#2a251f] dark:text-[#a89880]"
                          : "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                      }`}
                    >
                      {user.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className={actionBtn} onClick={() => openEdit(user)}>
                        Edit
                      </button>
                      <button type="button" className={actionBtn} onClick={() => openAssign(user)}>
                        Projects
                      </button>
                      <button type="button" className={actionBtn} onClick={() => void toggleActive(user)}>
                        {user.isActive === false ? "Activate" : "Deactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#8a7b68]">
                    No vendor logins yet. Add one and share the login.
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#8a7b68]">
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 shadow-xl dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {editing ? "Edit vendor" : "Add vendor"}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-[#8a7b68]">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className={labelClass}>Full name</p>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <p className={labelClass}>Email (login)</p>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <p className={labelClass}>Phone</p>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <p className={labelClass}>Vendor *</p>
                <select
                  value={form.vendorId}
                  onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
                  className={fieldClass}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className={labelClass}>Work category</p>
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
                <p className={labelClass}>Store</p>
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
                <p className={labelClass}>
                  {editing ? "New password (optional)" : "Temporary password"}
                </p>
                <div className="flex gap-2">
                  <input
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={fieldClass}
                    placeholder={editing ? "Leave blank to keep current" : ""}
                  />
                  <button
                    type="button"
                    className="inline-flex h-11 shrink-0 items-center rounded-xl border border-[#eadfcf] bg-white px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                    onClick={() =>
                      setForm((f) => ({ ...f, password: generateTempPassword() }))
                    }
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]">
                Cancel
              </button>
              <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assigning ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 shadow-xl dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Assign to vendor
                </h3>
                <p className="text-sm text-[#8a7b68]">
                  {assigning.name} will see these projects. CRM Assigned To is unchanged. Other
                  vendors on the same project stay assigned.
                </p>
              </div>
              <button type="button" onClick={() => setAssigning(null)} className="text-[#8a7b68]">
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
                    className="flex items-start gap-3 rounded-xl border border-[#eadfcf] bg-white px-3 py-2 dark:border-[#3a342c] dark:bg-[#1a1714]"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#1c1610]"
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
                      <span className="block text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                        {project.name}
                      </span>
                      <span className="text-xs text-[#8a7b68]">
                        {project.clientName || "—"}
                        {crmOwner ? ` · CRM Assigned To: ${crmOwner}` : ""}
                        {others.length
                          ? ` · other vendors: ${others.map((user) => user.name).join(", ")}`
                          : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
              {!projects.length ? (
                <p className="py-8 text-center text-sm text-[#8a7b68]">No projects in CRM yet.</p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAssigning(null)} className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]">
                Cancel
              </button>
              <button type="button" onClick={() => void saveAssign()} disabled={saving} className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                {saving ? "Saving…" : "Save assignments"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {credentials ? (
        <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-6 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <h3 className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Share login details
            </h3>
            <p className="mt-1 text-sm text-[#8a7b68]">
              Give these to the vendor. They sign in at the same CRM login page.
            </p>
            <dl className="mt-4 space-y-2 rounded-xl border border-[#eadfcf] bg-white p-4 text-sm dark:border-[#3a342c] dark:bg-[#1a1714]">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">Name</dt>
                <dd className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{credentials.name}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">Email</dt>
                <dd className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{credentials.email}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">Password</dt>
                <dd className="font-mono font-medium text-[#1c1610] dark:text-[#f3ece2]">{credentials.password}</dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
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
              </button>
              <button type="button" onClick={() => setCredentials(null)} className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
