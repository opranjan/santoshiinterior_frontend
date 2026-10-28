import ElevationSignoff from "@/components/design/ElevationSignoff";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Elevation",
  description: "Editable project signoff elevation PDF",
};

export default function ElevationPage() {
  return <ElevationSignoff />;
}
