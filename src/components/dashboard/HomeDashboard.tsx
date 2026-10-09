"use client";

import CrmDashboard from "@/components/dashboard/CrmDashboard";
import FranchiseeDashboardHome from "@/components/franchisee/FranchiseeDashboardHome";
import HrPanelHome from "@/components/hr-panel/HrPanelHome";
import { useAuth } from "@/context/AuthContext";
import { isHrPanelUser, isVendorPanelUser } from "@/lib/permissions";

export default function HomeDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  if (isHrPanelUser(user)) return <HrPanelHome />;
  if (isVendorPanelUser(user)) return <FranchiseeDashboardHome />;
  return <CrmDashboard />;
}
