import MetaInsights from "@/components/ads/MetaInsights";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Insights",
  description: "Meta Ads performance insights and CRM lead volume",
};

export default function MetaInsightsPage() {
  return <MetaInsights />;
}
