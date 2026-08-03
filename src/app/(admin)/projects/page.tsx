import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProjectsTable from "@/components/projects/ProjectsTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Projects",
  description: "Track interior design projects across stores",
};

export default function ProjectsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Projects" />
      <ProjectsTable />
    </div>
  );
}
