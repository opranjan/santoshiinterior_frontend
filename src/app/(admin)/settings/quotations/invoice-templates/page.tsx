import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Invoice Templates",
  description: "Manage invoice templates",
};

export default function Page() {
  return (
    <PlaceholderPage
      title="Invoice Templates"
      description="Create and edit invoice layouts used for customer billing."
    />
  );
}
