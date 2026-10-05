import AdminFranchiseeManager from "@/components/franchisee/AdminFranchiseeManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Vendor Panel",
  description: "Create and manage vendor panel logins, category, and assigned projects",
};

export default function FranchiseesPage() {
  return (
    <div className="vendor-form">
      <AdminFranchiseeManager />
    </div>
  );
}
