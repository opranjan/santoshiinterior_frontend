"use client";

import FranchiseeProjectsList from "@/components/franchisee/FranchiseeProjectsList";
import ProjectsTable from "@/components/projects/ProjectsTable";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";
import { Suspense } from "react";

export default function ProjectsPageView() {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-sm text-[#8a7b68]">Loading…</p>;
  if (isVendorPanelUser(user)) {
    return (
      <FranchiseeProjectsList
        title="Projects"
        subtitle="Projects assigned to your vendor account."
      />
    );
  }
  return (
    <Suspense fallback={<p className="text-sm text-[#8a7b68]">Loading projects…</p>}>
      <ProjectsTable />
    </Suspense>
  );
}
