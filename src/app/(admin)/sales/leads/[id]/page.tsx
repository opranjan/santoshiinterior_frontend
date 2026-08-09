import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LeadWorkspace from "@/components/leads/LeadWorkspace";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Lead Workspace",
  description: "Lead modules, quotations, and project workspace",
};

export default async function LeadWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageBreadcrumb pageTitle="Lead Workspace" />
      <LeadWorkspace leadId={id} />
    </div>
  );
}
