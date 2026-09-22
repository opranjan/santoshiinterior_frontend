import ProcurementOrders from "@/components/procurement/ProcurementOrders";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Orders",
  description: "Purchase and work orders",
};

export default function ProcurementOrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading orders...</p>}>
      <ProcurementOrders />
    </Suspense>
  );
}
