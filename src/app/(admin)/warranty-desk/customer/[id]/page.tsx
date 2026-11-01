import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CustomerWarrantyFormPage from "@/components/warranty/CustomerWarrantyFormPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Edit Customer Warranty",
  description: "Edit customer warranty and materials",
};

export default async function EditCustomerWarrantyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageBreadcrumb pageTitle="Edit Customer Warranty" />
      <CustomerWarrantyFormPage id={id} />
    </div>
  );
}
