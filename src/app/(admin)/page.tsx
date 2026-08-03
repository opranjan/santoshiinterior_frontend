import type { Metadata } from "next";
import React from "react";
import CrmDashboard from "@/components/dashboard/CrmDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Santoshi Interior multi-store CRM dashboard",
};

export default function DashboardPage() {
  return <CrmDashboard />;
}
