import QuotationSettings from "@/components/settings/QuotationSettings";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quotation Settings",
  description: "Configure quotation templates, config, and approval rules",
};

export default function Page() {
  return <QuotationSettings />;
}
