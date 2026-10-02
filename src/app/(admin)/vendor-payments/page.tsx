import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminPayVendor from "@/components/vendors/AdminPayVendor";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Pay Vendor",
  description: "Record company payouts to vendors",
};

export default function VendorPaymentsAdminPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Pay Vendor" />
      <AdminPayVendor />
    </div>
  );
}
