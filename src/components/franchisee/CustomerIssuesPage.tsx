"use client";

import { useAuth } from "@/context/AuthContext";
import { isFranchiseeUser } from "@/lib/permissions";
import FranchiseeCustomerIssues from "@/components/franchisee/FranchiseeCustomerIssues";
import CrmCustomerIssues from "@/components/franchisee/CrmCustomerIssues";

export default function CustomerIssuesPage() {
  const { user } = useAuth();
  if (isFranchiseeUser(user)) return <FranchiseeCustomerIssues />;
  return <CrmCustomerIssues />;
}
