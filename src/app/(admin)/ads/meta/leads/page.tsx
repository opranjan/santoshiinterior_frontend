import MetaLeadAdsList from "@/components/ads/MetaLeadAdsList";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Lead Ads",
  description: "Leads captured from Meta Lead Ads forms",
};

export default function MetaLeadAdsPage() {
  return <MetaLeadAdsList />;
}
