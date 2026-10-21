import InvoiceEditor from "@/components/accounting/InvoiceEditor";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Edit Invoice",
  description: "Update invoice details, add items and generate the final invoice",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceEditor id={id} />;
}
