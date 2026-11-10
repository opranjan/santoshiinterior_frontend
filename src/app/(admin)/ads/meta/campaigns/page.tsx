import MetaAdsComingSoon from "@/components/ads/MetaAdsComingSoon";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Campaigns",
  description: "Meta Ads campaigns",
};

export default function MetaCampaignsPage() {
  return (
    <MetaAdsComingSoon
      title="Campaigns"
      blurb="Browse Meta ad campaigns linked to your pages once Marketing API sync is enabled."
    />
  );
}
