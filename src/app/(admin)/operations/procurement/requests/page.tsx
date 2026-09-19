import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Procurement Requests",
  description: "Raise and track procurement requests",
};

export default function ProcurementRequestsPage() {
  return (
    <PlaceholderPage
      title="Requests"
      description="Raise material and service requests for projects, then convert them into RFQs and orders."
    />
  );
}
