import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WorkOrdersTable from "@/components/work-orders/WorkOrdersTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Work Orders",
  description: "Manage work orders across stores",
};

export default function WorkOrdersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Work Orders" />
      <WorkOrdersTable />
    </div>
  );
}
