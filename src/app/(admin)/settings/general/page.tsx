import GeneralSettings from "@/components/settings/GeneralSettings";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "General Settings",
  description: "Configure CRM and store settings",
};

export default function GeneralSettingsPage() {
  return (
    <div className="vendor-form">
      <GeneralSettings />
    </div>
  );
}
