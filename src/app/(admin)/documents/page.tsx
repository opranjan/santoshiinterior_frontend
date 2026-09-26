import FranchiseePlaceholder from "@/components/franchisee/FranchiseePlaceholder";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  return (
    <FranchiseePlaceholder
      title="Documents"
      body="Shared drawings, contracts, and handover files will be stored here."
    />
  );
}
