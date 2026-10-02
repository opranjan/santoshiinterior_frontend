import AiDesignStudio from "@/components/design/AiDesignStudio";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Elevation",
  description: "AI-powered elevation design with ChatGPT",
};

export default function ElevationPage() {
  return <AiDesignStudio mode="elevation" />;
}
