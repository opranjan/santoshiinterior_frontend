import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StoreForm from "@/components/stores/StoreForm";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Add Store",
  description: "Add or edit a Santoshi Interior store",
};

export default function AddStorePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Add / Edit Store" />
      <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
        <StoreForm />
      </Suspense>
    </div>
  );
}
