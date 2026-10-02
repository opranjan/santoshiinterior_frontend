import AiDesignStudio from "@/components/design/AiDesignStudio";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Designing",
  description: "AI-powered interior designing with ChatGPT",
};

export default function DesigningPage() {
  return <AiDesignStudio mode="designing" />;
}
