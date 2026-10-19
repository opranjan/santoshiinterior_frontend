import ModularCatalogPage from "@/components/settings/ModularCatalogPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Modular Catalog",
  description: "Manage product series, catalogues, and items",
};

export default function Page() {
  return <ModularCatalogPage />;
}
