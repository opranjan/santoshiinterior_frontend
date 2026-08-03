import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import GeneralSettings from "@/components/settings/GeneralSettings";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "General Settings",
  description: "Configure CRM and store settings",
};

export default function SettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="General Settings" />
      <GeneralSettings />
    </div>
  );
}
