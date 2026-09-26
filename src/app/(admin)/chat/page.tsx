import FranchiseePlaceholder from "@/components/franchisee/FranchiseePlaceholder";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Chat Box" };

export default function Page() {
  return (
    <FranchiseePlaceholder
      title="Chat Box"
      body="Chat with the Santoshi Interior team will be connected here."
    />
  );
}
