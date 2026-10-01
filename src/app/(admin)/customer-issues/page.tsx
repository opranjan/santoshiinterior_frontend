import FranchiseeCustomerIssues from "@/components/franchisee/FranchiseeCustomerIssues";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Customer Issue" };

export default function Page() {
  return <FranchiseeCustomerIssues />;
}
