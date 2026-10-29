import ModularCatalogCollectionDetail from "@/components/procurement/ModularCatalogCollectionDetail";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Order collection",
  description: "Assign project and vendor, then create order or purchase",
};

export default async function ModularCatalogCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ModularCatalogCollectionDetail id={id} />;
}
