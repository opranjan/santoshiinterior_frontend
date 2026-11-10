import MetaCampaigns from "@/components/ads/MetaCampaigns";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Meta Campaigns",
  description: "Meta Ads campaigns and linked CRM leads",
};

export default function MetaCampaignsPage() {
  return (
    <Suspense fallback={<div className="vendor-form p-6 text-sm text-[#8a7b68]">Loading campaigns…</div>}>
      <MetaCampaigns />
    </Suspense>
  );
}
