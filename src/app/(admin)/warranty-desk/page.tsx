import WarrantyDesk from "@/components/warranty/WarrantyDesk";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Warranty Desk",
  description: "Customer and vendor warranty coverage plus claim tickets",
};

export default function WarrantyDeskPage() {
  return (
    <div>
      <Suspense fallback={<p className="text-sm text-[#8a7b68]">Loading warranty desk…</p>}>
        <WarrantyDesk />
      </Suspense>
    </div>
  );
}
