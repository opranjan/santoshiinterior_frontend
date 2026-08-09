import QuotationCatalogs from "@/components/settings/QuotationCatalogs";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quotation Catalogs",
  description: "Manage quotation catalogs, categories, and UOMs",
};

export default function Page() {
  return <QuotationCatalogs />;
}
