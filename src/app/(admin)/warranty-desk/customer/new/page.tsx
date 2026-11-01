import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CustomerWarrantyFormPage from "@/components/warranty/CustomerWarrantyFormPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "New Customer Warranty",
  description: "Add customer warranty materials for a project",
};

export default function NewCustomerWarrantyPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="New Customer Warranty" />
      <CustomerWarrantyFormPage />
    </div>
  );
}
