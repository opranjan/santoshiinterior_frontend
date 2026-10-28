import AiDesignStudio from "@/components/design/AiDesignStudio";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Designing",
  description: "Interior designing",
};

export default function DesigningPage() {
  return <AiDesignStudio mode="designing" />;
}
