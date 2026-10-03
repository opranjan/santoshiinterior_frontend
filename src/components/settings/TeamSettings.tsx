"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

const selectClass =
  "h-9 appearance-none rounded-lg border border-[#eadfcf] bg-[#fdfbf7] px-2 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const fieldClass =
  "h-11 w-full rounded-xl border border-[#eadfcf] bg-[#fdfbf7] px-4 text-sm text-[#1c1610] outline-none placeholder:text-[#a89880] focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]";
const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]";

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
          isActive: "true",
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/settings"
            className="mb-2 inline-flex text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
          >
            ← Settings
          </Link>
          <h1
            className="font-serif text-[1.7rem] leading-tight text-[#1c1610] dark:text-[#f3ece2]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Team settings
          </h1>
          <p className="mt-1 text-sm text-[#8a7b68]">
            Manage members, roles, and store access for your CRM team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
          >
            Invite member
          </button>
        </div>
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
      {storeFilterId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-4 py-3 text-sm dark:border-[#3a342c] dark:bg-[#161411]">
          <span className="text-[#8a7b68]">
            Showing team for{" "}
            <strong className="text-[#1c1610] dark:text-[#f3ece2]">
              {storeOptions.find((s) => s.id === storeFilterId)?.name ||
                "Selected store"}
            </strong>
          </span>
          <Link
            href="/settings/team"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c4a574]"
          >
            View all team
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-[#8a7b68]">Loading team members…</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#eadfcf] md:grid-cols-4 md:divide-y-0 dark:divide-[#3a342c]">
          {roleOptions.slice(0, 4).map((role) => {
            const count = members.filter(
              (m) => m.role === role && m.status !== "Inactive"
            ).length;
            return (
              <div key={role} className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7b68]">
                  {role}
                </p>
                <p
                  className="mt-1 font-serif text-2xl text-[#1c1610] dark:text-[#f3ece2]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-3 dark:border-[#3a342c] dark:bg-[#161411] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${fieldClass} flex-1 sm:max-w-xs`}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "All" | RoleLabel)}
            className={fieldClass}
          >
            <option value="All">All Roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] dark:border-[#3a342c] dark:bg-[#161411]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-[#eadfcf] bg-[#f6efe4] dark:border-[#3a342c] dark:bg-[#1a1714]">
              <TableRow>
                {["Member", "Role", "Store Access", "Status", "Actions"].map(
                  (h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-4 py-3.5 text-start text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7b68]"
                    >
                      {h}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#eadfcf] dark:divide-[#3a342c]">
              {filtered.map((m) => (
                <TableRow key={m.id} className="store-row">
                  <TableCell className="px-4 py-3.5 text-start">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c1610] text-[10px] font-semibold text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]">
                        {initials(m.name)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[#1c1610] dark:text-[#f3ece2]">
                          {m.name}
                        </p>
                        <p className="text-xs text-[#8a7b68]">{m.email}</p>
                        <p className="text-xs text-[#a89880]">{m.phone}</p>
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
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        m.status === "Active"
                          ? "bg-[#1c1610] text-[#e8d5b5] dark:bg-[#e8d5b5] dark:text-[#1c1610]"
                          : "bg-[#eadfcf] text-[#8a7b68] dark:bg-[#2a251f] dark:text-[#a89880]"
                      }`}
                    >
                      {m.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(m.id)}
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7b68] hover:text-[#1c1610] dark:hover:text-[#f3ece2]"
                    >
                      {m.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-[#8a7b68]">
                    No team members match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfcf] bg-[#fbf8f3] p-6 shadow-2xl dark:border-[#3a342c] dark:bg-[#161411]">
            <div className="mb-5 flex items-center justify-between">
              <h3
                className="font-serif text-xl text-[#1c1610] dark:text-[#f3ece2]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Invite team member
              </h3>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-[#8a7b68] hover:text-[#1c1610]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="inviteName">Full name</label>
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
                <label className={labelClass} htmlFor="inviteEmail">Email</label>
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
                <label className={labelClass} htmlFor="invitePhone">Phone</label>
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
                <label className={labelClass} htmlFor="invitePassword">Temporary password</label>
                <input
                  id="invitePassword"
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as RoleLabel)
                  }
                  className={fieldClass}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Store access</label>
                <select
                  value={inviteStoreId}
                  onChange={(e) => setInviteStoreId(e.target.value)}
                  className={fieldClass}
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
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="inline-flex h-11 items-center rounded-xl border border-[#eadfcf] bg-white px-4 text-sm font-semibold text-[#1c1610] dark:border-[#3a342c] dark:bg-[#1a1714] dark:text-[#f3ece2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void inviteMember()}
                disabled={
                  saving ||
                  !inviteName.trim() ||
                  !inviteEmail.trim() ||
                  !invitePassword.trim()
                }
                className="inline-flex h-11 items-center rounded-xl bg-[#1c1610] px-5 text-sm font-semibold text-[#e8d5b5] disabled:opacity-40 dark:bg-[#e8d5b5] dark:text-[#1c1610]"
              >
                {saving ? "Saving…" : "Add member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
