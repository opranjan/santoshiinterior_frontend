import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Site Measurements Templates",
  description: "Manage site measurement templates",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Site Measurements Templates"
      description="Standardize site measurement sheets used before quotation."
    />
  );
}
