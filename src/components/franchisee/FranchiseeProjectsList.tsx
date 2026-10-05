"use client";

import React, { useEffect, useMemo, useState } from "react";
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

function statusTone(status?: string) {
  const key = String(status || "").toUpperCase();
  if (key === "COMPLETED") return "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
  if (key === "ON_HOLD") return "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200";
  if (key === "IN_PROGRESS" || key === "EXECUTION") return "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200";
  return "bg-[#f4efe6] text-[#9a7748]";
}

export default function FranchiseeProjectsList({
  title = "Projects",
  subtitle = "Projects assigned to your franchisee account.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void projectsApi
      .list({ limit: 50 })
      .then((res) => setItems((res.items || []) as ProjectRow[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const completed = items.filter((row) => String(row.status || "").toUpperCase() === "COMPLETED").length;
    const pending = items.filter((row) => {
      const key = String(row.status || "").toUpperCase();
      return key === "KICKOFF" || key === "ON_HOLD";
    }).length;
    return {
      total: items.length,
      completed,
      pending,
      ongoing: Math.max(0, items.length - completed - pending),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="vendor-rise">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a7748]">Vendor panel</p>
        <h1 className="vendor-serif mt-2 text-3xl text-[#111] md:text-4xl">{title}</h1>
        <div className="vendor-gold-rule mt-3" />
        <p className="mt-3 max-w-xl text-sm text-[#6b645b]">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total", value: loading ? "—" : counts.total },
          { label: "Completed", value: loading ? "—" : counts.completed },
          { label: "Ongoing", value: loading ? "—" : counts.ongoing },
          { label: "Pending", value: loading ? "—" : counts.pending },
        ].map((item, index) => (
          <div key={item.label} className={`vendor-card vendor-rise p-4 vendor-rise-delay-${index + 1}`}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">{item.label}</p>
            <p className="vendor-serif mt-2 text-3xl text-[#111]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((row, index) => (
          <article
            key={row.id}
            className={`vendor-card vendor-rise p-5 vendor-rise-delay-${(index % 6) + 1}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#9a7748]">
                {row.projectType ? enumToLabel(row.projectType) : "Assigned site"}
              </p>
              <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(row.status)}`}>
                {enumToLabel(row.status || "KICKOFF")}
              </span>
            </div>
            <h2 className="vendor-serif mt-3 text-2xl leading-tight text-[#111]">{row.name}</h2>
            <p className="mt-2 text-sm text-[#6b645b]">{row.address || "Location not listed"}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#eee6d8] pt-4 dark:border-[var(--vendor-line)]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9a7748]">Customer</p>
                <p className="mt-1 text-sm font-medium text-[#111]">{row.clientName || "—"}</p>
                {row.phone ? <p className="text-xs text-[#8a8175]">{row.phone}</p> : null}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9a7748]">Budget</p>
                <p className="mt-1 text-sm font-medium text-[#111]">{row.budget ? `₹ ${row.budget}` : "—"}</p>
              </div>
            </div>
          </article>
        ))}
        {!loading && !items.length ? (
          <p className="vendor-card p-10 text-center text-sm text-[#8a8175] md:col-span-2 xl:col-span-3">
            No projects assigned yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
