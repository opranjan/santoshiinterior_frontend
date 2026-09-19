"use client";

import React from "react";
import { useParams } from "next/navigation";
import VendorForm from "@/components/vendors/VendorForm";

export default function VendorBasicDetailsPage() {
  const params = useParams<{ id: string }>();
  return <VendorForm vendorId={params.id} />;
}
