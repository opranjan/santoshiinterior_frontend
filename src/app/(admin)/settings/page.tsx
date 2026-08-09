import SettingsHub from "@/components/settings/SettingsHub";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Settings",
  description: "CRM and quotation settings hub",
};

export default function SettingsPage() {
  return <SettingsHub />;
}
