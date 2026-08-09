"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { storesApi, usersApi } from "@/services/crmApi";

type RoleLabel =
  | "Admin"
  | "Sales Manager"
  | "Sales Executive"
  | "Designer"
  | "Site"
  | "Accounts"
  | "HR"
  | "Staff";

type MemberStatus = "Active" | "Inactive";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleLabel;
  storeId: string;
  store: string;
  status: MemberStatus;
};

const roleOptions: RoleLabel[] = [
  "Admin",
  "Sales Manager",
  "Sales Executive",
  "Designer",
  "Site",
  "Accounts",
  "HR",
  "Staff",
];

const roleToEnum: Record<RoleLabel, string> = {
  Admin: "ADMIN",
  "Sales Manager": "MANAGER",
  "Sales Executive": "SALES",
  Designer: "DESIGNER",
  Site: "SITE",
  Accounts: "ACCOUNTS",
  HR: "HR",
  Staff: "STAFF",
};

const enumToRole = (role?: string | null): RoleLabel => {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Sales Manager";
    case "SALES":
      return "Sales Executive";
    case "DESIGNER":
      return "Designer";
    case "SITE":
      return "Site";
    case "ACCOUNTS":
      return "Accounts";
    case "HR":
      return "HR";
    default:
      return "Staff";
  }
};

const statusColor: Record<MemberStatus, "success" | "light"> = {
  Active: "success",
  Inactive: "light",
};

const selectClass =
  "h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";
const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function mapUser(user: AuthUser): TeamMember {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "—",
    role: enumToRole(user.role),
    storeId: user.storeId || "",
    store: user.store?.name || "All Stores",
    status: user.isActive === false ? "Inactive" : "Active",
  };
}

export default function TeamSettings() {
  const searchParams = useSearchParams();
  const storeFilterId = searchParams.get("storeId") || "";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [storeOptions, setStoreOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | RoleLabel>("All");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [invitePassword, setInvitePassword] = useState("Welcome@123");
  const [inviteRole, setInviteRole] = useState<RoleLabel>("Sales Executive");
  const [inviteStoreId, setInviteStoreId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [users, stores] = await Promise.all([
        usersApi.list({
          limit: 100,
          ...(storeFilterId ? { storeId: storeFilterId } : {}),
        }),
        storesApi.list({ limit: 100 }),
      ]);
      setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
      setMembers(users.items.map(mapUser));
      if (storeFilterId) setInviteStoreId(storeFilterId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [storeFilterId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q);
      const matchRole = roleFilter === "All" || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, search, roleFilter]);

  const inviteMember = async () => {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      setError("Name, email, and password are required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const created = await usersApi.create({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim() || null,
        password: invitePassword.trim(),
        role: roleToEnum[inviteRole],
        storeId: inviteStoreId || null,
        isActive: true,
      });
      setMembers((prev) => [mapUser(created), ...prev]);
      setInviteName("");
      setInviteEmail("");
      setInvitePhone("");
      setInvitePassword("Welcome@123");
      setInviteRole("Sales Executive");
      setInviteStoreId("");
      setShowInvite(false);
      setNotice(`Member added. Temporary password: ${invitePassword.trim()}`);
      window.setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to invite member"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (id: string, role: RoleLabel) => {
    const prev = members;
    setMembers((current) =>
      current.map((m) => (m.id === id ? { ...m, role } : m))
    );
    try {
      setError("");
      const updated = await usersApi.update(id, { role: roleToEnum[role] });
      setMembers((current) =>
        current.map((m) => (m.id === id ? mapUser(updated) : m))
      );
    } catch (err) {
      setMembers(prev);
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const updateStore = async (id: string, storeId: string) => {
    const prev = members;
    const storeName =
      storeOptions.find((s) => s.id === storeId)?.name || "All Stores";
    setMembers((current) =>
      current.map((m) =>
        m.id === id ? { ...m, storeId, store: storeName } : m
      )
    );
    try {
      setError("");
      const updated = await usersApi.update(id, {
        storeId: storeId || null,
      });
      setMembers((current) =>
        current.map((m) => (m.id === id ? mapUser(updated) : m))
      );
    } catch (err) {
      setMembers(prev);
      setError(err instanceof Error ? err.message : "Failed to update store");
    }
  };

  const toggleStatus = async (id: string) => {
    const member = members.find((m) => m.id === id);
    if (!member) return;
    const nextActive = member.status !== "Active";
    const prev = members;
    setMembers((current) =>
      current.map((m) =>
        m.id === id
          ? { ...m, status: nextActive ? "Active" : "Inactive" }
          : m
      )
    );
    try {
      setError("");
      const updated = await usersApi.update(id, { isActive: nextActive });
      setMembers((current) =>
        current.map((m) => (m.id === id ? mapUser(updated) : m))
      );
    } catch (err) {
      setMembers(prev);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {notice}
        </div>
      )}
      {storeFilterId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
          <span className="text-gray-700 dark:text-gray-300">
            Showing team members for store:{" "}
            <strong className="text-gray-900 dark:text-white/90">
              {storeOptions.find((s) => s.id === storeFilterId)?.name ||
                "Selected store"}
            </strong>
          </span>
          <Link
            href="/settings/team"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            View all team
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Team Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage members, roles, and store access for your CRM team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            + Invite Member
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading team members…</div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {roleOptions.slice(0, 4).map((role) => {
          const count = members.filter(
            (m) => m.role === role && m.status !== "Inactive"
          ).length;
          return (
            <div
              key={role}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <p className="text-xs text-gray-500">{role}</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 sm:max-w-xs">
          <Input
            type="text"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "All" | RoleLabel)}
          className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="All">All Roles</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {["Member", "Role", "Store Access", "Status", "Actions"].map(
                  (h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="px-4 py-3 text-start">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
                        {initials(m.name)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                        <p className="text-xs text-gray-400">{m.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        void updateRole(m.id, e.target.value as RoleLabel)
                      }
                      className={selectClass}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <select
                      value={m.storeId}
                      onChange={(e) => void updateStore(m.id, e.target.value)}
                      className={selectClass}
                    >
                      <option value="">All Stores</option>
                      {storeOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge size="sm" color={statusColor[m.status]}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(m.id)}
                      className="text-sm font-medium text-brand-500 hover:text-brand-600"
                    >
                      {m.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500">
                    No team members match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Invite team member
              </h3>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="inviteName">Full Name</Label>
                <input
                  id="inviteName"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Enter name"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="inviteEmail">Email</Label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="invitePhone">Phone</Label>
                <input
                  id="invitePhone"
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label htmlFor="invitePassword">Temporary Password</Label>
                <input
                  id="invitePassword"
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as RoleLabel)
                  }
                  className={`${fieldClass} px-3`}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Store Access</Label>
                <select
                  value={inviteStoreId}
                  onChange={(e) => setInviteStoreId(e.target.value)}
                  className={`${fieldClass} px-3`}
                >
                  <option value="">All Stores</option>
                  {storeOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void inviteMember()}
                disabled={
                  saving ||
                  !inviteName.trim() ||
                  !inviteEmail.trim() ||
                  !invitePassword.trim()
                }
              >
                {saving ? "Saving…" : "Add Member"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
