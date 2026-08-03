import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage client profiles and relationships",
};

export default function ClientsPage() {
  return (
    <PlaceholderPage
      title="Clients"
      description="View and manage client profiles, project history, and communication."
    />
  );
}
