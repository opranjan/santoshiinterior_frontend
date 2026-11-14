import MetaAdSets from "@/components/ads/MetaAdSets";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Meta Ad Sets",
  description: "Meta Ads ad sets",
};

export default function MetaAdSetsPage() {
  return <MetaAdSets />;
}
