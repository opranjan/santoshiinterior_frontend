import RfqPage from "@/components/procurement/RfqPage";
import { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "RFQ",
  description: "RFQ vendor list and bidding comparison",
};

export default async function RfqIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading RFQ...</p>}>
      <RfqPage id={id} />
    </Suspense>
  );
}
