import AdminPayFranchisee from "@/components/franchisee/AdminPayFranchisee";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Vendor Payment",
  description: "Record company payouts to vendors",
};

export default function VendorPaymentsAdminPage() {
  return (
    <div>
      <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading…</p>}>
        <AdminPayFranchisee />
      </Suspense>
    </div>
  );
}
