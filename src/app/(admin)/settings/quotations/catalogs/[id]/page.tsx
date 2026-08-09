import CatalogDetail from "@/components/settings/CatalogDetail";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Catalog Items",
  description: "Manage quotation catalog items",
};

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function Page({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  return <CatalogDetail catalogId={resolved.id} />;
}
