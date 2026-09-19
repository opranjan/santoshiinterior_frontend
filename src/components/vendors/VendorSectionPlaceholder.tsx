"use client";

import React from "react";
import { useVendorRecord, VendorDataHeader } from "./VendorDataHeader";

export default function VendorSectionPlaceholder({
  vendorId,
  title,
}: {
  vendorId: string;
  title: string;
}) {
  const { vendor, error, loading } = useVendorRecord(vendorId);

  if (loading) return <p className="text-sm text-gray-500">Loading vendor...</p>;
  if (error) {
    return (
      <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-sm text-error-600">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <VendorDataHeader vendor={vendor} backHref={`/operations/vendors/${vendorId}`} />
      <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">Nothing here yet for this vendor.</p>
      </div>
    </div>
  );
}
