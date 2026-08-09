import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Modular Catalog",
  description: "Manage modular catalog",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Modular Catalog"
      description="Configure catalogs for modular kitchens and wardrobes."
    />
  );
}
