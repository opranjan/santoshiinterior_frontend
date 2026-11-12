import CatalogPdfEditor from "@/components/design/CatalogPdfEditor";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Catalog PDF Editor",
  description: "Edit and export Kitchen Collection material sheet PDF",
};

export default function CatalogPdfPage() {
  return <CatalogPdfEditor />;
}
