import ProcurementRfqs from "@/components/procurement/ProcurementRfqs";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Request For Quotation",
  description: "Send request-for-quotation to vendors",
};

export default function ProcurementRfqPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading RFQs...</p>}>
      <ProcurementRfqs />
    </Suspense>
  );
}
