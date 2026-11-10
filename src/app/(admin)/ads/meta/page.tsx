import MetaAdsOverview from "@/components/ads/MetaAdsOverview";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Ads",
  description: "Meta Ads overview — Lead Ads, campaigns, and connection",
};

export default function MetaAdsPage() {
  return <MetaAdsOverview />;
}
