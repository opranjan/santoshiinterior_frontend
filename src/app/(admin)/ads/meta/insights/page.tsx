import MetaAdsComingSoon from "@/components/ads/MetaAdsComingSoon";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Insights",
  description: "Meta Ads performance insights",
};

export default function MetaInsightsPage() {
  return (
    <MetaAdsComingSoon
      title="Insights"
      blurb="Spend, CTR, and lead cost will show here after Insights sync is connected."
    />
  );
}
