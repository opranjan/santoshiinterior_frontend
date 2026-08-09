"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import type { AccessRoleDto } from "@/lib/permissions";
import {
  formatActivityDate,
  formatDob,
} from "@/lib/userRoles";
import { rolesApi, storesApi, usersApi } from "@/services/crmApi";
import RoleManagementPanel from "./RoleManagementPanel";
import UserFormModal, {
  emptyUserForm,
  type UserFormState,
} from "./UserFormModal";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

type TabKey = "active" | "roles" | "groups" | "deactivated";

function RowMenu({
  onEdit,
  onToggleActive,
  isActive,
}: {
  onEdit: () => void;
  onToggleActive: () => void;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuWidth = 168;
  const menuHeight = 88;

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;
    const top = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );

    setMenuStyle({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  const toggleMenu = () => {
    if (!open) updateMenuPosition();
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="dropdown-toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label="Actions"
        aria-expanded={open}
      >
        ⋮
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[200]"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              />
              <div
                className="fixed z-[201] min-w-[168px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                style={{ top: menuStyle.top, left: menuStyle.left }}
              >
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                >
                  Edit user
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  onClick={() => {
                    setOpen(false);
                    onToggleActive();
                  }}
                >
                  {isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

export default function UsersManager() {
  const { user: currentUser } = useAuth();
  const canManageUsers = hasAnyPermission(currentUser, ["users.manage"]);

  const [tab, setTab] = useState<TabKey>("active");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<AccessRoleDto[]>([]);
  const [groups, setGroups] = useState<{
    stores: Array<{
      id: string;
      name: string;
      code: string;
      _count: { users: number };
    }>;
    unassignedActiveUsers: number;
  } | null>(null);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [managerOptions, setManagerOptions] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  const defaultRoleId = roles.find((r) => r.key === "SALES")?.id || roles[0]?.id || "";

  const loadUsers = useCallback(async () => {
    const data = await usersApi.list({
      limit: 200,
      isActive: tab === "deactivated" ? "false" : "true",
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(roleFilter !== "all" ? { accessRoleId: roleFilter } : {}),
    });
    setUsers(data.items);
  }, [tab, search, roleFilter]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [storesRes, rolesRes, activeUsers] = await Promise.all([
        storesApi.list({ limit: 100 }),
        rolesApi.list(),
        usersApi.list({ limit: 200, isActive: "true" }),
      ]);
      setStores(storesRes.items.map((s) => ({ id: s.id, name: s.name })));
      setRoles(rolesRes);
      setManagerOptions(
        activeUsers.items.filter((u) =>
          ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(u.role)
        )
      );
      await loadUsers();
      if (tab === "groups") {
        setGroups(await usersApi.listGroups());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [loadUsers, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = tab === "deactivated" ? 0 : users.length;
    const global = users.filter((u) => u.accessRole?.isGlobal).length;
    return { active, global };
  }, [users, tab]);

  const formInitial = useMemo((): UserFormState => {
    if (!editingUser) return emptyUserForm(defaultRoleId);
    return {
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone || "",
      password: "",
      accessRoleId: editingUser.accessRoleId || editingUser.accessRole?.id || defaultRoleId,
      dateOfBirth: editingUser.dateOfBirth?.slice(0, 10) || "",
      managerId: editingUser.managerId || "",
      storeId: editingUser.storeId || "",
    };
  }, [editingUser, defaultRoleId]);

  const saveUser = async (form: UserFormState) => {
    try {
      setSaving(true);
      setError("");
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        accessRoleId: form.accessRoleId,
        dateOfBirth: form.dateOfBirth || null,
        managerId: form.managerId || null,
        storeId: form.storeId || null,
      };

      if (editingUser) {
        await usersApi.update(editingUser.id, body);
        setNotice("User updated successfully");
      } else {
        await usersApi.create({
          ...body,
          password: form.password.trim(),
          isActive: true,
        });
        setNotice("User created — share the temporary password");
      }

      setFormOpen(false);
      setEditingUser(null);
      await load();
      window.setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AuthUser) => {
    try {
      setError("");
      if (user.isActive !== false) {
        await usersApi.deactivate(user.id);
        setNotice(`${user.name} deactivated`);
      } else {
        await usersApi.activate(user.id);
        setNotice(`${user.name} activated`);
      }
      await loadUsers();
      window.setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "active", label: "Active" },
    ...(canManageUsers ? [{ key: "roles" as TabKey, label: "Role Management" }] : []),
    { key: "groups", label: "Groups" },
    ...(canManageUsers ? [{ key: "deactivated" as TabKey, label: "Deactivated" }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage who can log in and what they can access.
          </p>
        </div>
        {(tab === "active" || tab === "deactivated") && canManageUsers && (
          <Button
            size="sm"
            className="bg-[#E85D75] hover:bg-[#d94c65]"
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          >
            + Add User
          </Button>
        )}
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

      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-6">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition ${
                tab === item.key
                  ? "border-[#E85D75] text-[#E85D75]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "roles" ? <RoleManagementPanel /> : null}

      {(tab === "active" || tab === "deactivated") && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs uppercase text-gray-500">
                {tab === "active" ? "Active users" : "Deactivated"}
              </p>
              <p className="mt-1 text-2xl font-semibold">{users.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs uppercase text-gray-500">Global access</p>
              <p className="mt-1 text-2xl font-semibold">{stats.global}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs uppercase text-gray-500">Roles available</p>
              <p className="mt-1 text-2xl font-semibold">{roles.length}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E85D75]/40 text-[#E85D75]"
              title="Filters"
            >
              ☰
            </button>
            <div className="relative min-w-[260px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>

          {showFilters ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800">
              <label className="text-sm text-gray-500">Filter by role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-2 h-10 w-full max-w-xs rounded-lg border border-gray-200 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="all">All roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader className="border-b border-gray-100 bg-gray-50">
                  <TableRow>
                    {[
                      "User Name",
                      "DOB",
                      "Mobile No.",
                      "Role",
                      "Activity",
                      "Manager",
                      "Actions",
                    ].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                        Loading users…
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">No users found</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Add a user and assign a role to grant CRM access.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="border-b border-gray-100">
                        <TableCell className="px-4 py-4">
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-gray-600">
                          {formatDob(user.dateOfBirth)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-gray-600">
                          {user.phone || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {user.accessRole?.label || user.roleLabel || user.role}
                            </span>
                            {user.accessRole?.isGlobal ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                🌐 Global
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            {user.accessRole?.permissions?.length ?? 0} permissions
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-gray-600">
                          <p>Last Login {formatActivityDate(user.lastLoginAt)}</p>
                          <p className="text-xs text-gray-400">
                            Last Active {formatActivityDate(user.lastActiveAt)}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-gray-600">
                          {user.manager?.name || "N/A"}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <RowMenu
                            isActive={user.isActive !== false}
                            onEdit={() => {
                              setEditingUser(user);
                              setFormOpen(true);
                            }}
                            onToggleActive={() => void toggleActive(user)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {tab === "groups" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500">Unassigned users</p>
            <p className="mt-2 text-2xl font-semibold">
              {groups?.unassignedActiveUsers ?? 0}
            </p>
          </div>
          {(groups?.stores || []).map((store) => (
            <div
              key={store.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800"
            >
              <p className="font-medium">{store.name}</p>
              <p className="text-xs text-gray-500">{store.code}</p>
              <p className="mt-3 text-sm text-gray-600">
                {store._count.users} users
              </p>
            </div>
          ))}
        </div>
      )}

      <UserFormModal
        open={formOpen}
        title={editingUser ? "Edit User" : "Add User"}
        initial={formInitial}
        roles={roles}
        managers={managerOptions}
        stores={stores}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={saveUser}
      />
    </div>
  );
}
