import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import VendorWarrantyFormPage from "@/components/warranty/VendorWarrantyFormPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "New Vendor Warranty",
  description: "Add vendor material warranties for a project",
};

export default function NewVendorWarrantyPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="New Vendor Warranty" />
      <VendorWarrantyFormPage />
    </div>
  );
}
