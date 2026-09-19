import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "RFQ",
  description: "Request quotations from vendors",
};

export default function ProcurementRfqPage() {
  return (
    <PlaceholderPage
      title="RFQ"
      description="Send request-for-quotation to vendors and compare their offers before placing an order."
    />
  );
}
