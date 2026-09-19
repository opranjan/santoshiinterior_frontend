import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import VendorsTable from "@/components/vendors/VendorsTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "My Vendors",
  description: "Manage vendor directory",
};

export default function MyVendorsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="My Vendors" />
      <VendorsTable />
    </div>
  );
}
