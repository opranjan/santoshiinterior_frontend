"use client";

import CrmDashboard from "@/components/dashboard/CrmDashboard";
import FranchiseeDashboardHome from "@/components/franchisee/FranchiseeDashboardHome";
import CasualStaffHome from "@/components/casual-staff/CasualStaffHome";
import HrPanelHome from "@/components/hr-panel/HrPanelHome";
import ProcurementDashboardHome from "@/components/procurement/ProcurementDashboardHome";
import { useAuth } from "@/context/AuthContext";
import {
  isCasualPanelUser,
  isHrPanelUser,
  isProcurementPanelUser,
  isVendorPanelUser,
} from "@/lib/permissions";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

export default function HomeDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (isCasualPanelUser(user)) return <CasualStaffHome mode="home" />;
  if (isHrPanelUser(user)) return <HrPanelHome />;
  if (isVendorPanelUser(user)) return <FranchiseeDashboardHome />;
  if (isProcurementPanelUser(user)) return <ProcurementDashboardHome />;
  return <CrmDashboard />;
}
