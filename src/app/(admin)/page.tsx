import type { Metadata } from "next";
import React from "react";
import HomeDashboard from "@/components/dashboard/HomeDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Santoshi Interior multi-store CRM dashboard",
};

export default function DashboardPage() {
  return <HomeDashboard />;
}
