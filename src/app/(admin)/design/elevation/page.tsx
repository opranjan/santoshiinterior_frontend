import ElevationSignoff from "@/components/design/ElevationSignoff";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Elevation",
  description: "Editable project signoff elevation PDF",
};

export default function ElevationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#8a7b68]">Loading elevation…</div>}>
      <ElevationSignoff />
    </Suspense>
  );
}
