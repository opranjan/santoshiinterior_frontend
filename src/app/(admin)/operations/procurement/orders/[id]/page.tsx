import PurchaseOrderEditor from "@/components/procurement/PurchaseOrderEditor";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Purchase Order",
  description: "Edit purchase or work order items",
};

export default async function ProcurementOrderIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseOrderEditor id={id} />;
}
