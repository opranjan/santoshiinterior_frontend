import ProjectsPageView from "@/components/projects/ProjectsPageView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Track interior design projects across stores",
};

export default function ProjectsPage() {
  return <ProjectsPageView />;
}
