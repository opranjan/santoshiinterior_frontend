import DocumentsWorkspace from "@/components/franchisee/DocumentsWorkspace";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  return <DocumentsWorkspace />;
}
