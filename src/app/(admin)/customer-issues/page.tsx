import FranchiseePlaceholder from "@/components/franchisee/FranchiseePlaceholder";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Customer Issue" };

export default function Page() {
  return (
    <FranchiseePlaceholder
      title="Customer Issue"
      body="Raise and track customer site issues from this screen."
    />
  );
}
