import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import HrDashboard from "@/components/hr/HrDashboard";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "HR",
  description: "Manage human resources across stores",
};

export default function HrPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="HR" />
      <HrDashboard />
    </div>
  );
}
