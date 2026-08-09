import QuotationMaker from "@/components/quotations/QuotationMaker";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quotation Maker",
  description: "Build and customize quotation documents",
};

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function Page({ params }: Props) {
  const resolved = await Promise.resolve(params);
  return <QuotationMaker quotationId={resolved.id} />;
}
