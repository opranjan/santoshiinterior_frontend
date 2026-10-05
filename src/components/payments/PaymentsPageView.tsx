"use client";

import FranchiseePayments from "@/components/franchisee/FranchiseePayments";
import PaymentsDashboard from "@/components/payments/PaymentsDashboard";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";

export default function PaymentsPageView() {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-sm text-[#8a7b68]">Loading...</p>;
  if (isVendorPanelUser(user)) return <FranchiseePayments />;
  return <PaymentsDashboard />;
}
