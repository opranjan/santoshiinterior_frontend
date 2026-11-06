"use client";

import FranchiseePaymentHistory from "@/components/franchisee/FranchiseePaymentHistory";
import ProjectPayments from "@/components/payments/ProjectPayments";
import { useAuth } from "@/context/AuthContext";
import { isVendorPanelUser } from "@/lib/permissions";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";

export default function ProjectPaymentsPageView({ projectId }: { projectId: string }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (isVendorPanelUser(user)) return <FranchiseePaymentHistory projectId={projectId} />;
  return <ProjectPayments projectId={projectId} />;
}
