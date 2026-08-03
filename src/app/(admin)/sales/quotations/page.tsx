import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuotationsTable from "@/components/quotations/QuotationsTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quotations",
  description: "Create, share and track interior design quotations",
};

export default function QuotationsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Quotations" />
      <QuotationsTable />
    </div>
  );
}
