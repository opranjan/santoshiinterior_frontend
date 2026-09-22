import AcceptanceReceive from "@/components/procurement/AcceptanceReceive";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Acceptance",
  description: "Receive order items",
};

export default async function AcceptanceIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AcceptanceReceive id={id} />;
}
