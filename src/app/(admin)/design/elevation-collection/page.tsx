import ElevationCollection from "@/components/design/ElevationCollection";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Elevation Collection",
  description: "Manage elevation material series and collections",
};

export default function ElevationCollectionPage() {
  return <ElevationCollection />;
}
