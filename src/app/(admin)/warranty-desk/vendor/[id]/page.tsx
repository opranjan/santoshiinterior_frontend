import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import VendorWarrantyFormPage from "@/components/warranty/VendorWarrantyFormPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Edit Vendor Warranty",
  description: "Edit vendor material warranty",
};

export default async function EditVendorWarrantyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageBreadcrumb pageTitle="Edit Vendor Warranty" />
      <VendorWarrantyFormPage id={id} />
    </div>
  );
}
