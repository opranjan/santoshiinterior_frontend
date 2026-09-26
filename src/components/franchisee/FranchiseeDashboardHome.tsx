"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { projectsApi } from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";
import { useAuth } from "@/context/AuthContext";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  status?: string;
  projectType?: string | null;
  budget?: string | null;
  updatedAt?: string;
};

export default function FranchiseeDashboardHome() {
  const { user } = useAuth();
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void projectsApi
      .list({ limit: 8 })
      .then((res) => setItems((res.items || []) as ProjectRow[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const active = items.filter(
    (row) => row.status && row.status !== "COMPLETED" && row.status !== "ON_HOLD"
  ).length;

  const kpis = [
    { label: "My projects", value: loading ? "—" : String(items.length), href: "/projects" },
    { label: "Active", value: loading ? "—" : String(active), href: "/projects" },
    { label: "Payments", value: "Open", href: "/payments" },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 px-5 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
              Santoshi Interior CRM
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {user?.name || "Franchisee"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Your projects, payments, and documents in the same CRM portal.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="sm">+ Add New Project</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white/90">Recent projects</h2>
          <Link href="/projects" className="text-sm font-medium text-brand-600 dark:text-brand-400">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white/90">{row.name}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.clientName || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.projectType || "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge size="sm" color="light">
                      {enumToLabel(row.status || "KICKOFF")}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!loading && !items.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No projects yet. Add your first project.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
