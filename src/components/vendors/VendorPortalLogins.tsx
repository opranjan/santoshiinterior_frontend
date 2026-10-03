"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import { rolesApi, usersApi } from "@/services/crmApi";
import { toastError, toastSuccess } from "@/components/ui/toast/ToastHost";
import type { AuthUser } from "@/lib/auth";

export default function VendorPortalLogins({ vendorId, vendorName }: { vendorId: string; vendorName?: string }) {
  const [items, setItems] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(vendorName || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(`Vn@${Math.random().toString(36).slice(-6)}1`);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list({ limit: 200, isActive: "true" });
      setItems((data.items || []).filter((row) => row.vendorId === vendorId));
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to load vendor logins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [vendorId]);

  const createLogin = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toastError("Name, email and password are required.");
      return;
    }
    setSaving(true);
    try {
      const roles = await rolesApi.list();
      const vendorRole = roles.find((row) => row.key === "VENDOR");
      if (!vendorRole) throw new Error("Vendor role is missing. Restart the API once.");
      await usersApi.create({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        accessRoleId: vendorRole.id,
        vendorId,
        isActive: true,
      });
      setCreated({ email: email.trim(), password: password.trim() });
      toastSuccess("Vendor login created. Share email and password.");
      setPassword(`Vn@${Math.random().toString(36).slice(-6)}1`);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create login");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Vendor portal login</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create a login for this vendor. After they sign in they see only their dashboard, design, assigned projects, procurement, and payouts.
        </p>
      </div>
      {created ? (
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm">
          Share these credentials: <strong>{created.email}</strong> / <strong>{created.password}</strong>
        </div>
      ) : null}
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 dark:border-gray-800 dark:bg-white/[0.03]">
        <input className="h-11 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90" placeholder="Contact name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="h-11 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90" placeholder="Login email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="h-11 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button size="sm" disabled={saving} onClick={() => void createLogin()}>
          {saving ? "Saving…" : "+ Create vendor login"}
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="min-w-full text-sm text-gray-700 dark:text-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Last login</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2.5">{row.name}</td>
                <td className="px-4 py-2.5">{row.email}</td>
                <td className="px-4 py-2.5 text-gray-500">{row.lastLoginAt ? String(row.lastLoginAt).slice(0, 10) : "Never"}</td>
              </tr>
            ))}
            {!loading && !items.length ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No portal logins yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
