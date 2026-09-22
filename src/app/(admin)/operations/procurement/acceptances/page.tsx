import ProcurementAcceptances from "@/components/procurement/ProcurementAcceptances";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Acceptance",
  description: "Receive and accept purchase and work orders",
};

export default function ProcurementAcceptancesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading acceptance...</p>}>
      <ProcurementAcceptances />
    </Suspense>
  );
}
