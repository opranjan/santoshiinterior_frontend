import ProcurementRequestEditor from "@/components/procurement/ProcurementRequestEditor";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Request / New",
  description: "Raise a procurement request",
};

export default async function ProcurementRequestEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProcurementRequestEditor id={id} />;
}
