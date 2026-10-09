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
import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import type { AccessRoleDto } from "@/lib/permissions";
import {
  formatActivityDate,
  formatDob,
} from "@/lib/userRoles";
import { rolesApi, storesApi, usersApi, vendorsApi } from "@/services/crmApi";
import RoleManagementPanel from "./RoleManagementPanel";
import UserFormModal, {
  emptyUserForm,
  generateTempPassword,
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
        className="dropdown-toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8a7b68] hover:bg-[#eadfcf] dark:hover:bg-[#2a251f]"
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
                className="fixed z-[201] min-w-[168px] rounded-xl border border-[#eadfcf] bg-[#fbf8f3] py-1 shadow-lg dark:border-[#3a342c] dark:bg-[#161411]"
                style={{ top: menuStyle.top, left: menuStyle.left }}
              >
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-[#1c1610] hover:bg-[#eadfcf]/60 dark:text-[#f3ece2] dark:hover:bg-[#2a251f]"
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                >
                  Edit user
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-[#1c1610] hover:bg-[#eadfcf]/60 dark:text-[#f3ece2] dark:hover:bg-[#2a251f]"
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
  const canManageRoles = hasAnyPermission(currentUser, ["users.manage", "roles.manage"]);

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
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
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
  const [prefillFranchisee, setPrefillFranchisee] = useState(false);
  const [prefillHr, setPrefillHr] = useState(false);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    franchisee: boolean;
    hr?: boolean;
  } | null>(null);

  const franchiseeRoleId = roles.find((r) => r.key === "FRANCHISEE")?.id || "";
  const hrPanelRoleId =
    roles.find((r) => r.key === "HR_PANEL")?.id || roles.find((r) => r.key === "HR")?.id || "";
  const defaultRoleId = franchiseeRoleId
    ? roles.find((r) => r.key === "SALES")?.id || roles[0]?.id || ""
    : roles.find((r) => r.key === "SALES")?.id || roles[0]?.id || "";

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
      const [storesRes, rolesRes, activeUsers, vendorsRes] = await Promise.all([
        storesApi.list({ limit: 100 }),
        rolesApi.list(),
        usersApi.list({ limit: 200, isActive: "true" }),
        vendorsApi.list({ limit: 200 }).catch(() => ({ items: [] })),
      ]);
      setStores(storesRes.items.map((s) => ({ id: s.id, name: s.name })));
      setVendors((vendorsRes.items || []).map((v) => ({ id: v.id, name: v.name })));
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
    if (!editingUser) {
      const roleId = prefillHr && hrPanelRoleId
        ? hrPanelRoleId
        : prefillFranchisee && franchiseeRoleId
          ? franchiseeRoleId
          : defaultRoleId;
      const form = emptyUserForm(roleId);
      form.password = generateTempPassword();
      return form;
    }
    return {
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone || "",
      sipExtension: editingUser.sipExtension || "",
      password: "",
      accessRoleId: editingUser.accessRoleId || editingUser.accessRole?.id || defaultRoleId,
      dateOfBirth: editingUser.dateOfBirth?.slice(0, 10) || "",
      managerId: editingUser.managerId || "",
      storeId: editingUser.storeId || "",
      vendorId: editingUser.vendorId || "",
    };
  }, [editingUser, defaultRoleId, franchiseeRoleId, hrPanelRoleId, prefillFranchisee, prefillHr]);

  const saveUser = async (form: UserFormState) => {
    try {
      setSaving(true);
      setError("");
      const selectedRoleKey = roles.find((r) => r.id === form.accessRoleId)?.key;
      const selectedIsFranchisee = selectedRoleKey === "FRANCHISEE";
      const selectedIsVendor = selectedRoleKey === "VENDOR";
      const selectedIsHr = selectedRoleKey === "HR_PANEL" || selectedRoleKey === "HR";
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        sipExtension: form.sipExtension.trim() || null,
        accessRoleId: form.accessRoleId,
        dateOfBirth: form.dateOfBirth || null,
        managerId: form.managerId || null,
        storeId: form.storeId || null,
        vendorId: selectedIsVendor || selectedIsFranchisee ? form.vendorId || null : null,
      };

      if (editingUser) {
        await usersApi.update(editingUser.id, {
          ...body,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        setNotice("User updated successfully");
        if (form.password.trim()) {
          setCredentials({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
            franchisee: selectedIsFranchisee,
            hr: selectedIsHr,
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
          franchisee: selectedIsFranchisee,
          hr: selectedIsHr,
        });
        setNotice("User created. Copy the login details and share them.");
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
    ...(canManageRoles ? [{ key: "roles" as TabKey, label: "Role Management" }] : []),
    { key: "groups", label: "Groups" },
    ...(canManageUsers ? [{ key: "deactivated" as TabKey, label: "Deactivated" }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4a574]">
            Access
          </p>
          <h1
            className="mt-1 font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Users
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Manage who can log in and what they can access.
          </p>
        </div>
        {(tab === "active" || tab === "deactivated") && canManageUsers && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!franchiseeRoleId) {
                  setError("Vendor panel role is not ready yet. Restart the API, then try again.");
                  return;
                }
                setEditingUser(null);
                setPrefillHr(false);
                setPrefillFranchisee(true);
                setFormOpen(true);
              }}
              className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            >
              Add vendor
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hrPanelRoleId) {
                  setError("HR panel role is not ready yet. Restart the API, then try again.");
                  return;
                }
                setEditingUser(null);
                setPrefillFranchisee(false);
                setPrefillHr(true);
                setFormOpen(true);
              }}
              className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
            >
              Add HR panel
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setPrefillFranchisee(false);
                setPrefillHr(false);
                setFormOpen(true);
              }}
              className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
            >
              Add user
            </button>
          </div>
        )}
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

      <div className="inline-flex flex-wrap overflow-hidden rounded-xl border border-[#eadfcf] dark:border-[#3a342c]">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] ${
              tab === item.key
                ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                : "bg-[#fdfbf7] text-[#8a7b68] dark:bg-[#1a1714]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "roles" ? <RoleManagementPanel /> : null}

      {(tab === "active" || tab === "deactivated") && (
        <>
          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="grid grid-cols-1 divide-y divide-[#eadfcf] sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-[#3a342c]">
              <div className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                  {tab === "active" ? "Active users" : "Deactivated"}
                </p>
                <p className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {users.length}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                  Global access
                </p>
                <p className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {stats.global}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                  Roles available
                </p>
                <p className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {roles.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone"
                className="h-11 flex-1 rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              />
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                {showFilters ? "Hide filters" : "Filters"}
              </button>
            </div>
            {showFilters ? (
              <div className="mt-3">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
                  Filter by role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-11 w-full max-w-xs appearance-none rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-3.5 text-sm text-[#1c1610] outline-none dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
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
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader className="border-b border-[#eadfcf] bg-[#f6efe4] dark:border-[#3a342c] dark:bg-[#1a1714]">
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
                        className="px-4 py-3.5 text-start text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#eadfcf] dark:divide-[#3a342c]">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-[#8a7b68]">
                        Loading users…
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-12 text-center">
                        <p className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                          No users found
                        </p>
                        <p className="mt-1 text-sm text-[#8a7b68]">
                          Add a user and assign a role to grant CRM access.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="store-row">
                        <TableCell className="px-4 py-4">
                          <p className="font-medium text-[#1c1610] dark:text-[#f3ece2]">{user.name}</p>
                          <p className="text-xs text-[#8a7b68]">{user.email}</p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-[#8a7b68]">
                          {formatDob(user.dateOfBirth)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-[#8a7b68]">
                          {user.phone || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                              {user.accessRole?.label || user.roleLabel || user.role}
                            </span>
                            {user.accessRole?.isGlobal ? (
                              <span className="rounded-full bg-[#eadfcf] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68] dark:bg-[#2a251f]">
                                Global
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[#a89880]">
                            {user.accessRole?.permissions?.length ?? 0} permissions
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-[#8a7b68]">
                          <p>Last Login {formatActivityDate(user.lastLoginAt)}</p>
                          <p className="text-xs text-[#a89880]">
                            Last Active {formatActivityDate(user.lastActiveAt)}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-[#8a7b68]">
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
          <div className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]">
              Unassigned users
            </p>
            <p className="mt-2 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {groups?.unassignedActiveUsers ?? 0}
            </p>
          </div>
          {(groups?.stores || []).map((store) => (
            <div
              key={store.id}
              className="vendor-form-card rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-5 dark:border-[#3a342c] dark:bg-[#161411]"
            >
              <p className="font-serif text-lg text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {store.name}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c4a574]">{store.code}</p>
              <p className="mt-3 text-sm text-[#8a7b68]">{store._count.users} users</p>
            </div>
          ))}
        </div>
      )}

      <UserFormModal
        open={formOpen}
        title={
          editingUser
            ? "Edit User"
              : prefillHr
              ? "Add HR Panel"
              : prefillFranchisee
              ? "Add Vendor"
              : "Add User"
        }
        initial={formInitial}
        roles={roles.filter((role) => role.key !== "VENDOR")}
        managers={managerOptions}
        stores={stores}
        vendors={vendors}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
          setPrefillFranchisee(false);
          setPrefillHr(false);
        }}
        onSubmit={saveUser}
      />

      {credentials ? (
        <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-6 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <h3 className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Share login details
            </h3>
            <p className="mt-1 text-sm text-[#8a7b68]">
              {credentials.hr
                ? "Give these to HR. They sign in at the same URL and will see the HR panel."
                : credentials.franchisee
                ? "Give these to the vendor. They sign in to the same CRM and will see the Vendor panel."
                : "Give these to the user for first login."}
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
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">Login URL</dt>
                <dd className="break-all font-medium text-[#1c1610] dark:text-[#f3ece2]">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/signin`
                    : "/signin"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
                onClick={async () => {
                  const origin =
                    typeof window !== "undefined" ? window.location.origin : "";
                  const text = [
                    `Name: ${credentials.name}`,
                    `Email: ${credentials.email}`,
                    `Password: ${credentials.password}`,
                    `Login: ${origin}/signin`,
                    credentials.hr
                      ? "After login they see the HR panel"
                      : credentials.franchisee
                      ? "After login they see the Vendor panel"
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n");
                  try {
                    await navigator.clipboard.writeText(text);
                    setNotice("Login details copied");
                    window.setTimeout(() => setNotice(""), 2500);
                  } catch {
                    setError("Could not copy. Copy the details manually.");
                  }
                }}
              >
                Copy details
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                onClick={() => setCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
