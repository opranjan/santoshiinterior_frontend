import TeamSettings from "@/components/settings/TeamSettings";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Team Settings",
  description: "Manage team members and roles",
};

export default function TeamSettingsPage() {
  return (
    <div className="vendor-form">
      <TeamSettings />
    </div>
  );
}
