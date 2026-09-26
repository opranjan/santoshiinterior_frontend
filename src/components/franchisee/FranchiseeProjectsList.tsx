"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { projectsApi } from "@/services/crmApi";
import { enumToLabel } from "@/lib/mappers";

type ProjectRow = {
  id: string;
  name: string;
  clientName?: string | null;
  phone?: string | null;
  status?: string;
  projectType?: string | null;
  address?: string | null;
  budget?: string | null;
};

export default function FranchiseeProjectsList() {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void projectsApi
      .list({ limit: 50 })
      .then((res) => setItems((res.items || []) as ProjectRow[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Projects</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Projects assigned to your franchisee account.
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">+ Add New Project</Button>
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Budget</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white/90">{row.name}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                  {row.clientName || "—"}
                  {row.phone ? <span className="block text-xs text-gray-400">{row.phone}</span> : null}
                </td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.address || "—"}</td>
                <td className="px-4 py-2.5 text-gray-800 dark:text-white/90">
                  {row.budget ? `₹ ${row.budget}` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge size="sm" color="light">
                    {enumToLabel(row.status || "KICKOFF")}
                  </Badge>
                </td>
              </tr>
            ))}
            {!loading && !items.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No projects yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
