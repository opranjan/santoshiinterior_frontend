"use client";

import React from "react";
import { useParams } from "next/navigation";
import VendorProjects from "@/components/vendors/VendorProjects";

export default function VendorProjectsPage() {
  const params = useParams<{ id: string }>();
  return <VendorProjects vendorId={params.id} />;
}
