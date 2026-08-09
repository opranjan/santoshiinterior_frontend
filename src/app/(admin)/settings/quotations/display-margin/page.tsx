import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quotation Display & Margin Settings",
  description: "Configure quotation display and margins",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Quotation Display & Margin Settings"
      description="Control PDF display options, visibility, and margin rules."
    />
  );
}
