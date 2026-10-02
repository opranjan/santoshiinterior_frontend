import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminPayFranchisee from "@/components/franchisee/AdminPayFranchisee";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Pay Franchisee",
  description: "Record franchisee payouts and DLP settlements",
};

export default function FranchiseePaymentsAdminPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Pay Franchisee" />
      <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading…</p>}>
        <AdminPayFranchisee />
      </Suspense>
    </div>
  );
}
