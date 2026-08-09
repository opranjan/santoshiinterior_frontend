import QuotationsDashboard from "@/components/quotations/QuotationsDashboard";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Quotations",
  description: "Quotations summary, pipeline and risk analysis",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Loading quotations…</div>}>
      <QuotationsDashboard />
    </Suspense>
  );
}
