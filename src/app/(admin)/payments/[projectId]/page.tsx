import ProjectPaymentsPageView from "@/components/payments/ProjectPaymentsPageView";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Project Payments",
  description: "Project payment history and funds",
};

export default async function ProjectPaymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectPaymentsPageView projectId={projectId} />;
}
