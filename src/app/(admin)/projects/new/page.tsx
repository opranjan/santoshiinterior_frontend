import NewProjectPageView from "@/components/projects/NewProjectPageView";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Add New Project" };

export default function NewProjectPage() {
  return <NewProjectPageView />;
}
