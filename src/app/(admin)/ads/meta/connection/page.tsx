import MetaAdsConnection from "@/components/ads/MetaAdsConnection";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Ads Connection",
  description: "Meta Lead Ads webhook and token status",
};

export default function MetaAdsConnectionPage() {
  return <MetaAdsConnection />;
}
