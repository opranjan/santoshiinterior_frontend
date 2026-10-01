import PaymentsPageView from "@/components/payments/PaymentsPageView";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Payments",
  description: "Track customer and vendor payments",
};

export default function PaymentsPage() {
  return <PaymentsPageView />;
}
