import PlaceholderPage from "@/components/common/PlaceholderPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Acceptances",
  description: "Confirm vendor order acceptances",
};

export default function ProcurementAcceptancesPage() {
  return (
    <PlaceholderPage
      title="Acceptances"
      description="Record vendor acceptances, delivery confirmation, and order acknowledgements."
    />
  );
}
