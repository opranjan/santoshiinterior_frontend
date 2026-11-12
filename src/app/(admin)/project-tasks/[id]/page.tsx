import ProjectTasksPanel from "@/components/projects/ProjectTasksPanel";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Project tasks",
  description: "Full-screen project task board",
};

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectTasksPanel projectId={id} />;
}
