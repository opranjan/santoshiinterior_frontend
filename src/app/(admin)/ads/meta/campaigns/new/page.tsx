import MetaCreateCampaignWizard from "@/components/ads/MetaCreateCampaignWizard";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Create Meta Campaign",
  description: "Create Instant Form lead ads on Meta",
};

export default function MetaCreateCampaignPage() {
  return <MetaCreateCampaignWizard />;
}
