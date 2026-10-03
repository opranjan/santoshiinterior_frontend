import VendorsTable from "@/components/vendors/VendorsTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "My Vendors",
  description: "Manage vendor directory",
};

export default function MyVendorsPage() {
  return (
    <div className="vendor-form">
      <VendorsTable />
    </div>
  );
}
