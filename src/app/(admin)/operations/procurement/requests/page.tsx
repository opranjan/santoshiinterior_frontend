import ProcurementRequests from "@/components/procurement/ProcurementRequests";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Procurement Requests",
  description: "Raise and track procurement requests",
};

export default function ProcurementRequestsPage() {
  return <ProcurementRequests />;
}
