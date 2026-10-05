"use client";

import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";
import FranchiseeCustomerIssues from "@/components/franchisee/FranchiseeCustomerIssues";
import CrmCustomerIssues from "@/components/franchisee/CrmCustomerIssues";

export default function CustomerIssuesPage() {
  const { user } = useAuth();
  if (isVendorPanelUser(user)) return <FranchiseeCustomerIssues />;
  return <CrmCustomerIssues />;
}
