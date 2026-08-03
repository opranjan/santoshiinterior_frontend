import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuotationForm from "@/components/quotations/QuotationForm";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Create Quotation",
  description: "Create quotation from lead or client",
};

export default function CreateQuotationPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Create Quotation" />
      <Suspense fallback={<div className="text-sm text-gray-500">Loading form...</div>}>
        <QuotationForm />
      </Suspense>
    </div>
  );
}
