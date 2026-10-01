"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FranchiseePayments from "@/components/franchisee/FranchiseePayments";
import PaymentsTable from "@/components/payments/PaymentsTable";
import { useAuth } from "@/context/AuthContext";
import { isFranchiseeUser } from "@/lib/permissions";

export default function PaymentsPageView() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  if (isFranchiseeUser(user)) return <FranchiseePayments />;
  return (
    <div>
      <PageBreadcrumb pageTitle="Payments" />
      <PaymentsTable />
    </div>
  );
}
