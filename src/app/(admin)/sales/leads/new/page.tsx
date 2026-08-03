import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LeadForm from "@/components/leads/LeadForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Add Lead",
  description: "Capture a new interior design lead",
};

export default function AddLeadPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Add Lead" />
      <LeadForm />
    </div>
  );
}
