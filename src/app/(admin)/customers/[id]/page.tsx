import CustomerProfile from "@/components/customers/CustomerProfile";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Customer | Santoshi Interiors CRM",
  description: "Customer profile, orders, addresses and website activity",
};

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerProfile customerId={id} />;
}
