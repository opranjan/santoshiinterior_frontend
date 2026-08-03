import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Deals",
  description: "Track deals and opportunities across stores",
};

export default function DealsPage() {
  return (
    <PlaceholderPage
      title="Deals"
      description="Manage active deals and opportunities through your sales pipeline."
    />
  );
}
