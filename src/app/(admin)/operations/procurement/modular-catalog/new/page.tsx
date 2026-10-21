import ModularCatalogOrderCreate from "@/components/procurement/ModularCatalogOrderCreate";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Create Modular Catalog Order",
  description: "Build a purchase order from a modular catalog size",
};

export default function ModularCatalogOrderCreatePage() {
  return <ModularCatalogOrderCreate />;
}
