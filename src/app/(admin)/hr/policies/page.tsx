import HrPoliciesPage from "@/components/hr-panel/HrPoliciesPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "HR Policies" };

export default function Page() {
  return <HrPoliciesPage />;
}
