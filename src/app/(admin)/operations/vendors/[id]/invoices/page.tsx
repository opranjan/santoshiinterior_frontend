"use client";

import React from "react";
import { useParams } from "next/navigation";
import VendorSectionPlaceholder from "@/components/vendors/VendorSectionPlaceholder";

export default function VendorInvoicesPage() {
  const params = useParams<{ id: string }>();
  return <VendorSectionPlaceholder vendorId={params.id} title="Invoices" />;
}
