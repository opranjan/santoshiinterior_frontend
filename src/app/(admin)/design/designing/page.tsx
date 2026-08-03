import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AiDesignStudio from "@/components/design/AiDesignStudio";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Designing",
  description: "AI-powered interior designing with ChatGPT",
};

export default function DesigningPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Designing" />
      <AiDesignStudio mode="designing" />
    </div>
  );
}
