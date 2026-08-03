import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WarrantyDeskTable from "@/components/warranty/WarrantyDeskTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Warranty Desk",
  description: "Handle customer warranty and after-sales requests",
};

export default function WarrantyDeskPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Warranty Desk" />
      <WarrantyDeskTable />
    </div>
  );
}
