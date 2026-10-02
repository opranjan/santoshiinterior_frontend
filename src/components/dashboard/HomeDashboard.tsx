"use client";

import CrmDashboard from "@/components/dashboard/CrmDashboard";
import FranchiseeDashboardHome from "@/components/franchisee/FranchiseeDashboardHome";
import VendorDashboardHome from "@/components/vendors/VendorDashboardHome";
import { useAuth } from "@/context/AuthContext";
import { isFranchiseeUser, isVendorUser } from "@/lib/permissions";

export default function HomeDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  if (isFranchiseeUser(user)) return <FranchiseeDashboardHome />;
  if (isVendorUser(user)) return <VendorDashboardHome />;
  return <CrmDashboard />;
}
