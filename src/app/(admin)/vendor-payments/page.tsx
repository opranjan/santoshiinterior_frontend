import AdminPayFranchisee from "@/components/franchisee/AdminPayFranchisee";
import { PageSkeleton } from "@/components/ui/loader/CrmLoader";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Vendor Payment",
  description: "Record company payouts to vendors",
};

export default function VendorPaymentsAdminPage() {
  return (
    <div>
      <Suspense fallback={<PageSkeleton />}>
        <AdminPayFranchisee />
      </Suspense>
    </div>
  );
}
