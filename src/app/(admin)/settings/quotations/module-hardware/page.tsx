import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Module Hardware & Accessories",
  description: "Manage module hardware and accessories",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Module Hardware & Accessories"
      description="Legacy hardware and accessories mapping for quotation modules."
    />
  );
}
