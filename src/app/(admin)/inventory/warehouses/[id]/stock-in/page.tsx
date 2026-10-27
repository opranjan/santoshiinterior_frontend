import StockInEditor from "@/components/inventory/StockInEditor";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Add Stock",
  description: "Stock-in items into a warehouse",
};

export default function StockInPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading stock-in…</div>}>
      <StockInEditor />
    </Suspense>
  );
}
