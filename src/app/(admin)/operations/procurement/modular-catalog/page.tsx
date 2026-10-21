import ModularCatalogOrders from "@/components/procurement/ModularCatalogOrders";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Modular Catalog Order",
  description: "Create purchase orders from the modular catalog",
};

export default function ModularCatalogOrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading orders...</p>}>
      <ModularCatalogOrders />
    </Suspense>
  );
}
