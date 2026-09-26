import FranchiseePlaceholder from "@/components/franchisee/FranchiseePlaceholder";
import { Metadata } from "next";

export const metadata: Metadata = { title: "DLP Payment" };

export default function Page() {
  return (
    <FranchiseePlaceholder
      title="DLP Payment"
      body="Defect liability period payments for handed-over projects will be listed here."
    />
  );
}
