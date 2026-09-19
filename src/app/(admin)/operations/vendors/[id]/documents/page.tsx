"use client";

import React from "react";
import { useParams } from "next/navigation";
import VendorDocuments from "@/components/vendors/VendorDocuments";

export default function VendorDocumentsPage() {
  const params = useParams<{ id: string }>();
  return <VendorDocuments vendorId={params.id} />;
}
