"use client";

import React, { useEffect, useState } from "react";
import VendorPageHeader from "@/components/vendors/VendorPageHeader";
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

export default function VendorAssignedProjects() {
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
      <VendorPageHeader
        title="Assigned projects"
        subtitle="Sites Santoshi Interior has given to your workshop. You can view them here; new projects are added from CRM."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((row, index) => (
          <article
            key={row.id}
            className={`vendor-card vendor-rise p-6 vendor-rise-delay-${(index % 6) + 1}`}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a7748]">
              {enumToLabel(row.status || "KICKOFF")}
            </p>
            <h2 className="vendor-serif mt-2 text-2xl">{row.name}</h2>
            <p className="mt-2 text-sm text-[#6b645b]">{row.address || "Location not listed"}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#9a7748]">Customer</p>
                <p className="mt-1 text-[#111] dark:text-[var(--vendor-ink)]">{row.clientName || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#9a7748]">Budget</p>
                <p className="mt-1 text-[#111] dark:text-[var(--vendor-ink)]">{row.budget ? `₹ ${row.budget}` : "—"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!loading && !items.length ? (
        <div className="vendor-card p-10 text-center text-sm text-[#8a8175]">No projects assigned yet.</div>
      ) : null}
    </div>
  );
}
