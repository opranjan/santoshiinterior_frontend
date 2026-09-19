"use client";

import React from "react";
import { useParams } from "next/navigation";
import VendorDataHub from "@/components/vendors/VendorDataHub";

export default function VendorDataPage() {
  const params = useParams<{ id: string }>();
  return <VendorDataHub vendorId={params.id} />;
}
