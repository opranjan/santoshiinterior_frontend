import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Payment & Tax Settings",
  description: "Configure payment and tax settings",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Payment & Tax Settings"
      description="Configure GST, tax slabs, payment terms, and invoice tax mapping."
    />
  );
}
