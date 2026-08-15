import IntegrationsSettings from "@/components/settings/IntegrationsSettings";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Connect WhatsApp, email, and other tools to your CRM",
};

export default function IntegrationsPage() {
  return (
    <div>
      <IntegrationsSettings />
    </div>
  );
}
