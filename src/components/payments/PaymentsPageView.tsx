"use client";

import FranchiseePayments from "@/components/franchisee/FranchiseePayments";
import PaymentsDashboard from "@/components/payments/PaymentsDashboard";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

export default function PaymentsPageView() {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (isVendorPanelUser(user)) return <FranchiseePayments />;
  return <PaymentsDashboard />;
}
