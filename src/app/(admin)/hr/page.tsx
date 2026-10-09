import HrPanelHome from "@/components/hr-panel/HrPanelHome";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "HR Dashboard",
  description: "HR panel dashboard",
};

export default function HrPage() {
  return <HrPanelHome />;
}
