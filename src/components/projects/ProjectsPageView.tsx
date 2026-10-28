"use client";

import FranchiseeProjectsList from "@/components/franchisee/FranchiseeProjectsList";
import ProjectsTable from "@/components/projects/ProjectsTable";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

export default function ProjectsPageView() {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (isVendorPanelUser(user)) {
    return (
      <FranchiseeProjectsList
        title="Projects"
        subtitle="Projects assigned to your vendor account."
      />
    );
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectsTable />
    </Suspense>
  );
}
