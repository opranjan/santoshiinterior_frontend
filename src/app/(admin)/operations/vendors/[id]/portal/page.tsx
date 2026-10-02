"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useVendorRecord, VendorDataHeader } from "@/components/vendors/VendorDataHeader";
import VendorPortalLogins from "@/components/vendors/VendorPortalLogins";

export default function VendorPortalPage() {
  const params = useParams<{ id: string }>();
  const { vendor, loading, error } = useVendorRecord(params.id);
  if (loading) return <p className="text-sm text-gray-500">Loading vendor...</p>;
  if (error) return <p className="text-sm text-error-600">{error}</p>;
  return (
    <div className="space-y-6">
      <VendorDataHeader vendor={vendor} />
      <VendorPortalLogins vendorId={params.id} vendorName={vendor?.name} />
    </div>
  );
}
