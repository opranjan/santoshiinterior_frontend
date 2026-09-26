"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FranchiseeProjectsList from "@/components/franchisee/FranchiseeProjectsList";
import ProjectsTable from "@/components/projects/ProjectsTable";
import { useAuth } from "@/context/AuthContext";
import { isFranchiseeUser } from "@/lib/permissions";
import { Suspense } from "react";

export default function ProjectsPageView() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  if (isFranchiseeUser(user)) return <FranchiseeProjectsList />;
  return (
    <div>
      <PageBreadcrumb pageTitle="Projects" />
      <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading projects…</p>}>
        <ProjectsTable />
      </Suspense>
    </div>
  );
}
