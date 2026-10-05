import ProjectPayments from "@/components/payments/ProjectPayments";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Project Payments",
  description: "Project expenses and funds",
};

export default async function ProjectPaymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectPayments projectId={projectId} />;
}
