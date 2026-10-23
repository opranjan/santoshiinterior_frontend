import ProjectDetailView from "@/components/projects/ProjectDetailView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project detail",
  description: "Assigned project details",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
