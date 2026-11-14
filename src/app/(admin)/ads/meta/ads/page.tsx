import MetaAdsCreatives from "@/components/ads/MetaAdsCreatives";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Ads & Creatives",
  description: "Meta Ads creatives and ads",
};

export default function MetaAdsCreativesPage() {
  return <MetaAdsCreatives />;
}
