import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PaymentsTable from "@/components/payments/PaymentsTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Payments",
  description: "Track customer and vendor payments",
};

export default function PaymentsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Payments" />
      <PaymentsTable />
    </div>
  );
}
