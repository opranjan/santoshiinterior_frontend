import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PurchaseOrdersTable from "@/components/purchase-orders/PurchaseOrdersTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Procurement Orders",
  description: "Manage purchase orders for materials and vendors",
};

export default function ProcurementOrdersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Orders" />
      <PurchaseOrdersTable />
    </div>
  );
}
