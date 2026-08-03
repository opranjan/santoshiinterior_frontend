import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProjectSettings from "@/components/settings/ProjectSettings";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Project Settings",
  description: "Configure project types, scopes, budgets, and defaults",
};

export default function ProjectSettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Project Settings" />
      <ProjectSettings />
    </div>
  );
}
