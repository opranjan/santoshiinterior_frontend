import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFranchiseeManager from "@/components/franchisee/AdminFranchiseeManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Franchisee Management",
  description: "Create and manage franchisee logins, category, and assigned projects",
};

export default function FranchiseesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Franchisees" />
      <AdminFranchiseeManager />
    </div>
  );
}
