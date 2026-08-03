import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Connect third-party tools to your CRM",
};

export default function IntegrationsPage() {
  return (
    <PlaceholderPage
      title="Integrations"
      description="Connect WhatsApp, email, accounting, and other tools used by your stores."
    />
  );
}
